// app/forgot-password.tsx
// Password reset flow. Calls AuthService.resetPassword; Supabase sends
// a reset link to the user's email. The link redirects back to the
// app's configured reset URL (Supabase dashboard setting) where the
// user lands on a "set new password" screen (consumer-implemented).

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileInput,
  MobilePrimaryButton,
  MobileActionFooter,
  MobileAlert,
} from '../components/MobilePremium';
import { useAuth, useAppTheme } from '../context';
import { replaceWithLogin } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const result = await resetPassword(email.trim());
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? 'Reset request failed.');
      return;
    }
    setSent(true);
  };

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="auth" />
      <MobileHeader title="Reset password" eyebrow="Account" />
      <View style={styles.body}>
        <MobileSurface padding={20}>
          {sent ? (
            <MobileAlert
              variant="success"
              title="Check your inbox"
              body={`We sent a password reset link to ${email}. It expires in 60 minutes.`}
            />
          ) : (
            <>
              <Text style={[styles.help, { color: colors.textSecondary }]}>
                Enter your email and we&rsquo;ll send a link to reset your password.
              </Text>
              <View style={{ height: 16 }} />
              <MobileInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
              />
              {error ? (
                <>
                  <View style={{ height: 12 }} />
                  <MobileAlert variant="error" title="Reset failed" body={error} />
                </>
              ) : null}
            </>
          )}
        </MobileSurface>
        <View style={{ height: 16 }} />
        <Text style={[styles.help, { color: colors.textSecondary }]}>
          <Text
            accessibilityRole="link"
            onPress={replaceWithLogin}
            style={{ color: colors.brand, fontWeight: '600' }}
          >
            Back to sign in
          </Text>
        </Text>
      </View>
      {!sent ? (
        <MobileActionFooter>
          <MobilePrimaryButton
            onPress={handleSubmit}
            loading={submitting}
            disabled={!email}
          >
            Send Reset Link
          </MobilePrimaryButton>
        </MobileActionFooter>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  body: {
    ...SCREEN_BODY_STYLE,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  help: {
    fontSize: 14,
    textAlign: 'center',
  },
});
