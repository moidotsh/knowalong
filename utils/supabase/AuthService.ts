// utils/supabase/AuthService.ts
// Arqavellum's default auth surface: Supabase email/password. Wraps the
// supabase-js auth API in a domain-agnostic service so consumers get a
// working auth flow out of the box (login, register, logout, session
// restore, password reset). Consumers needing PIN+device-UUID auth
// re-add those primitives as a customization — see CLAUDE.md →
// "When to add PIN auth".

import { supabase } from './client';
import { logger } from '../logger';
import { AppError, ErrorCode } from '../errors';

export interface AuthSession {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
}

/**
 * AuthService — thin wrapper over Supabase email/password auth.
 *
 * All methods return `AuthResult` so callers can branch on `success`
 * without try/catch. Errors are logged via the structured logger and
 * returned with a user-facing message.
 */
export class AuthService {
  /**
   * Register a new user with email + password. Supabase sends a
   * confirmation email by default (configurable in the Supabase
   * dashboard); the returned session is null until the user clicks
   * the link.
   */
  static async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        logger.warn('auth', 'signUp error:', error.message);
        return { success: false, error: error.message };
      }
      if (!data.session) {
        // Email confirmation required — surface this so the UI can
        // route to a "check your inbox" state.
        return { success: true, session: undefined };
      }
      return { success: true, session: toAuthSession(data.session) };
    } catch (e) {
      logger.error('auth', 'signUp unexpected error:', e);
      return { success: false, error: 'Sign-up failed. Please try again.' };
    }
  }

  /**
   * Sign in with email + password. On success, Supabase persists the
   * session (via the persistSession client option) — subsequent
   * supabase.from(...) / supabase.rpc(...) calls carry the JWT.
   */
  static async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        logger.warn('auth', 'signIn error:', error.message);
        return { success: false, error: error.message };
      }
      if (!data.session) {
        return { success: false, error: 'No session returned.' };
      }
      return { success: true, session: toAuthSession(data.session) };
    } catch (e) {
      logger.error('auth', 'signIn unexpected error:', e);
      return { success: false, error: 'Sign-in failed. Please try again.' };
    }
  }

  /**
   * Sign out. Revokes the session server-side and clears local state.
   */
  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.warn('auth', 'signOut error:', error.message);
      }
    } catch (e) {
      logger.error('auth', 'signOut unexpected error:', e);
    }
  }

  /**
   * Restore the session from persisted storage. Call once on app boot
   * (typically inside the AuthProvider) to determine the initial auth
   * state. Returns null if no valid session exists.
   */
  static async restoreSession(): Promise<AuthSession | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        logger.warn('auth', 'getSession error:', error.message);
        return null;
      }
      if (!data.session) return null;
      return toAuthSession(data.session);
    } catch (e) {
      logger.error('auth', 'restoreSession unexpected error:', e);
      return null;
    }
  }

  /**
   * Send a password-reset email. The email contains a link that
   * redirects back to the app's reset URL (configured in the Supabase
   * dashboard).
   */
  static async resetPassword(email: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        logger.warn('auth', 'resetPassword error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e) {
      logger.error('auth', 'resetPassword unexpected error:', e);
      return { success: false, error: 'Password reset failed. Please try again.' };
    }
  }

  /**
   * Update the password for the currently authenticated user.
   * Used after the user clicks the reset link and lands on the
   * reset-confirmation screen.
   */
  static async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        logger.warn('auth', 'updatePassword error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e) {
      logger.error('auth', 'updatePassword unexpected error:', e);
      return { success: false, error: 'Password update failed. Please try again.' };
    }
  }

  /**
   * Subscribe to auth state changes. The callback fires immediately
   * with the current session and on every sign-in / sign-out / token
   * refresh. Returns an unsubscribe function.
   */
  static onAuthStateChange(
    callback: (session: AuthSession | null) => void,
  ): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session ? toAuthSession(session) : null);
    });
    return () => data.subscription.unsubscribe();
  }
}

function toAuthSession(session: {
  user: { id: string; email?: string };
  access_token: string;
  refresh_token: string;
}): AuthSession {
  if (!session.user.email) {
    throw new AppError(
      'Auth session missing user.email',
      ErrorCode.AUTH_ERROR,
    );
  }
  return {
    userId: session.user.id,
    email: session.user.email,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  };
}

export default AuthService;
