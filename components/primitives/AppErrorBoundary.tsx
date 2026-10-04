// components/primitives/AppErrorBoundary.tsx
// Top-level React error boundary. Catches render-time errors anywhere
// in the tree and shows a fallback UI instead of a white screen.
//
// Scope: catches React render-time errors only. Does NOT catch errors
// in event handlers, async code, setTimeout, or web workers — those
// routes need their own try/catch + logger wiring.
//
// The fallback UI is intentionally theme-free (raw inline styles, no
// Tamagui dependency, no useAppTheme call) so it still renders when
// the theme system itself is the source of the crash. The hex colors
// below are s7-exempt for this reason.

import React, { Component } from 'react';
import type { ErrorInfo } from 'react';
import { logger } from '../../utils';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Wrap the entire app once, at the root, outside ThemeProvider. Catches
 * unhandled render errors anywhere in the tree.
 *
 * The boundary logs the caught error via the canonical logger so
 * error-reporting pipelines (when wired) see it. It does NOT attempt
 * automatic recovery — the user reloads the page to retry.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(
      'general',
      'Unhandled render error caught by AppErrorBoundary:',
      error,
      info.componentStack ?? '',
    );
  }

  private handleReload = (): void => {
    this.setState({ hasError: false });
    if (typeof window !== 'undefined' && typeof window.location === 'object' && typeof window.location.reload === 'function') {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const containerStyle: React.CSSProperties = {
      // s7-exempt — theme-free fallback so the boundary renders even when the theme system is the source of the crash.
      // Night Metro night ground + bone text: a crashed app still reads as
      // the night service, never a white flash.
      color: '#F2EFE9',
      backgroundColor: '#0C1016',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: 24,
      fontFamily: "'Golos Text', system-ui, -apple-system, sans-serif",
      textAlign: 'center',
    };
    const titleStyle: React.CSSProperties = {
      // s7-exempt — theme-free fallback. Signage face with system fallbacks.
      fontFamily: "'Unbounded', system-ui, sans-serif",
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 12,
    };
    const bodyStyle: React.CSSProperties = {
      // s7-exempt — theme-free fallback (night secondary text)
      color: '#B9C6D4',
      fontSize: 14,
      marginBottom: 20,
    };
    const buttonStyle: React.CSSProperties = {
      // s7-exempt — theme-free fallback (Night Metro filament amber plate,
      // textOnBrand ink; plate-square radius)
      color: '#1A1206',
      backgroundColor: '#FFB020',
      padding: '10px 20px',
      fontSize: 14,
      fontWeight: 700,
      border: 'none',
      borderRadius: 2,
      cursor: 'pointer',
    };

    return (
      <div role="alert" style={containerStyle}>
        <h1 style={titleStyle}>Something went wrong</h1>
        <p style={bodyStyle}>The app hit an unexpected error. Reloading usually fixes it.</p>
        <button type="button" onClick={this.handleReload} style={buttonStyle}>
          Reload
        </button>
      </div>
    );
  }
}
