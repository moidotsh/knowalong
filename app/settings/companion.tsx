// app/settings/companion.tsx
// Companion credential paste + test connection + clear. Privacy notice.
// Surface specific error taxonomy (companion.mixed-content-blocked etc.)
// rather than a generic "companion unavailable".

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MobileAtmosphere,
  MobileSurface,
  MobileHeader,
  MobileInput,
  MobileSectionEyebrow,
  MobileActionFooter,
  MobilePrimaryButton,
  MobileAlert,
} from '../../components/MobilePremium';
import { useAppTheme } from '../../context';
import { safeGoBack } from '../../navigation';
import { SCREEN_BODY_STYLE } from '../../constants';
import {
  useCompanionCredential,
  useCompanionHealth,
  useSaveCompanionCredential,
  useClearCompanionCredential,
} from '../../hooks';
import type { CompanionConnectionError } from '../../shared/types/knowalong';

function describeHealthError(err: unknown): { title: string; body: string } {
  if (err && typeof err === 'object' && 'kind' in err) {
    const kind = (err as CompanionConnectionError).kind;
    switch (kind) {
      case 'companion.mixed-content-blocked':
        return {
          title: 'Browser blocked the request',
          body: 'Your browser may block HTTPS→HTTP loopback. Try the local dev origin, or run KnowAlong locally.',
        };
      case 'companion.unauthorized':
        return { title: 'Token mismatch', body: 'Re-copy the token from the companion banner.' };
      case 'companion.origin-forbidden':
        return {
          title: 'Origin not allowed',
          body: 'Add this origin to allowedOrigins in the companion config and restart it.',
        };
      case 'companion.unreachable':
        return {
          title: 'No response',
          body: 'Is the companion running on 127.0.0.1:8765? Start it with `cd tools/local-companion && bun run dev`.',
        };
      case 'companion.timeout':
        return { title: 'Timed out', body: 'The companion took too long to respond.' };
      default:
        return { title: 'Network error', body: 'Could not reach the companion.' };
    }
  }
  return { title: 'Network error', body: 'Could not reach the companion.' };
}

export default function CompanionSettingsScreen() {
  const { colors } = useAppTheme();
  const credentialQuery = useCompanionCredential();
  const healthQuery = useCompanionHealth();
  const saveMutation = useSaveCompanionCredential();
  const clearMutation = useClearCompanionCredential();

  const [tokenDraft, setTokenDraft] = useState('');
  const [baseUrlDraft, setBaseUrlDraft] = useState(credentialQuery.data?.baseUrl ?? '');

  const hasCredential = !!credentialQuery.data?.hasCredential;
  const showSavedBaseUrl = hasCredential && !baseUrlDraft;
  const baseUrlValue = showSavedBaseUrl ? credentialQuery.data!.baseUrl : baseUrlDraft;

  const errorInfo = healthQuery.isError ? describeHealthError(healthQuery.error) : null;
  const isHealthy = healthQuery.isSuccess;

  return (
    <SafeAreaView
      style={[styles.shell, { backgroundColor: colors.backgroundDeep }]}
      edges={['top', 'bottom']}
    >
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Local companion" eyebrow="Settings" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={styles.bodyContent}>
        <MobileSurface padding={14}>
          <Text style={[styles.title, { color: colors.text }]}>Companion</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            The local companion is an optional, opt-in service that runs on
            this machine (127.0.0.1:8765). It wraps Ollama to perform
            source-text analysis and CLCC realization proposals. It binds to
            loopback only, never writes to your Supabase data, and owns its
            own token.
          </Text>
        </MobileSurface>

        <MobileSectionEyebrow>Token</MobileSectionEyebrow>
        <MobileSurface padding={14}>
          <Text style={[styles.body, { color: colors.textSecondary, marginBottom: 10 }]}>
            On first start the companion prints a token once. Paste it here.
            The PWA never generates a token on its own.
          </Text>
          <MobileInput
            label="Companion token"
            value={tokenDraft}
            onChangeText={setTokenDraft}
            placeholder="Paste companion token"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <View style={{ height: 10 }} />
          <MobileInput
            label="Companion base URL"
            value={baseUrlValue}
            onChangeText={setBaseUrlDraft}
            placeholder="http://127.0.0.1:8765"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </MobileSurface>

        <MobileSectionEyebrow>Status</MobileSectionEyebrow>
        <MobileSurface padding={14}>
          {hasCredential ? (
            <View style={styles.statusBlock}>
              <Text style={[styles.statusLabel, { color: colors.text }]}>
                {isHealthy ? 'Connected' : errorInfo ? 'Error' : 'Checking…'}
              </Text>
              {errorInfo ? (
                <MobileAlert
                  variant="error"
                  title={errorInfo.title}
                  body={errorInfo.body}
                />
              ) : isHealthy ? (
                <Text style={[styles.statusText, { color: colors.status.success }]}>
                  Companion reachable on loopback.
                </Text>
              ) : (
                <Text style={[styles.statusText, { color: colors.textMuted }]}>
                  Contacting /health…
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              No credential saved. Paste a token and tap Save to test the
              connection.
            </Text>
          )}
        </MobileSurface>

        <MobileSectionEyebrow>Privacy</MobileSectionEyebrow>
        <MobileSurface padding={14}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            The token is stored locally on this device and travels only in the
            Authorization header of loopback requests. It never appears in
            URLs, query strings, or persisted event payloads.
          </Text>
        </MobileSurface>
      </ScrollView>
      <MobileActionFooter>
        {hasCredential ? (
          <MobilePrimaryButton
            variant="secondary"
            onPress={() => {
              clearMutation.mutate();
              setTokenDraft('');
              setBaseUrlDraft('');
            }}
            disabled={clearMutation.isPending}
          >
            Clear credential
          </MobilePrimaryButton>
        ) : null}
        <MobilePrimaryButton
          onPress={() => {
            if (!tokenDraft) return;
            saveMutation.mutate({
              token: tokenDraft,
              baseUrl: baseUrlDraft || undefined,
            });
            setTokenDraft('');
          }}
          disabled={!tokenDraft || saveMutation.isPending}
        >
          Save
        </MobilePrimaryButton>
      </MobileActionFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  statusBlock: {
    gap: 10,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
