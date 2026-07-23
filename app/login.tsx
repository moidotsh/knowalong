// app/login.tsx
// Email + password login. Wires AuthService.signIn via useAuth.
// On success, the central AuthGuard in app/_layout.tsx routes to
// home — no per-screen redirect effect needed.

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
import { navigateToRegister, navigateToForgotPassword } from '../navigation';
import { SCREEN_BODY_STYLE } from '../constants';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? 'Sign-in failed.');
    }
    // On success, the central AuthGuard in _layout.tsx redirects home.
  };

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor: colors.backgroundDeep }]} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="auth" />
      <MobileHeader title="Welcome back" eyebrow="Sign in" />
      <View style={styles.body}>
        <MobileSurface padding={20}>
          <MobileInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
          />
          <View style={{ height: 12 }} />
          <MobileInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
          />
          <View style={{ height: 12 }} />
          <Text
            accessibilityRole="link"
            onPress={navigateToForgotPassword}
            style={[styles.link, { color: colors.brand }]}
          >
            Forgot password?
          </Text>
          {error ? (
            <View style={{ height: 12 }} />
          ) : null}
          {error ? <MobileAlert variant="error" title="Sign-in failed" body={error} /> : null}
        </MobileSurface>

        <View style={{ height: 16 }} />
        <Text style={[styles.help, { color: colors.textSecondary }]}>
          New to KnowAlong?{' '}
          <Text
            accessibilityRole="link"
            onPress={navigateToRegister}
            style={{ color: colors.brand, fontWeight: '600' }}
          >
            Create an account
          </Text>
          .
        </Text>
      </View>
      <MobileActionFooter>
        <MobilePrimaryButton
          onPress={handleSubmit}
          loading={submitting}
          disabled={!email || !password}
        >
          Sign In
        </MobilePrimaryButton>
      </MobileActionFooter>
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
  link: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  help: {
    fontSize: 14,
    textAlign: 'center',
  },
});
