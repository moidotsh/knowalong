// components/knowalong/CompanionStatusChip.tsx
// Compact green/amber/red/grey chip reflecting companion health. Reads
// useCompanionCredential + useCompanionHealth. The chip surfaces a specific
// tooltip per error taxonomy (deliverable 5) — never a generic "unavailable".

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context';
import { useCompanionCredential, useCompanionHealth } from '../../hooks';
import type { CompanionConnectionError } from '../../shared/types/knowalong';

type ChipState = 'green' | 'amber' | 'red' | 'grey';

function describeError(err: unknown): string {
  if (err && typeof err === 'object' && 'kind' in err) {
    const kind = (err as CompanionConnectionError).kind;
    switch (kind) {
      case 'companion.mixed-content-blocked':
        return 'Your browser may block HTTPS→HTTP loopback. Try the local dev origin, or run KnowAlong locally.';
      case 'companion.unauthorized':
        return 'Token mismatch. Re-copy the token from the companion banner.';
      case 'companion.origin-forbidden':
        return 'Origin not in the companion allowlist. Add this origin in companion config.';
      case 'companion.unreachable':
        return 'No response. Is the companion running on 127.0.0.1:8765?';
      case 'companion.timeout':
        return 'Companion took too long to respond.';
      case 'companion.network-error':
        return 'Network error reaching the companion.';
      default:
        return 'Companion error.';
    }
  }
  return 'Companion error.';
}

export function CompanionStatusChip() {
  const { colors } = useAppTheme();
  const credentialQuery = useCompanionCredential();
  const healthQuery = useCompanionHealth();

  let state: ChipState = 'grey';
  let label = 'Not configured';
  let tooltip = 'Paste a companion token in Settings → Companion.';

  if (!credentialQuery.data?.hasCredential) {
    state = 'grey';
    label = 'Not configured';
    tooltip = 'Paste a companion token in Settings → Companion.';
  } else if (healthQuery.isLoading) {
    state = 'amber';
    label = 'Checking…';
    tooltip = 'Contacting companion /health…';
  } else if (healthQuery.isSuccess) {
    state = 'green';
    label = 'Connected';
    tooltip = 'Companion reachable on loopback.';
  } else if (healthQuery.isError) {
    state = 'red';
    label = 'Error';
    tooltip = describeError(healthQuery.error);
  }

  const fgByState: Record<ChipState, string> = {
    green: colors.status.success,
    amber: colors.status.warning,
    red: colors.status.error,
    grey: colors.textMuted,
  };
  const bgByState: Record<ChipState, string> = {
    green: `${colors.status.success}1A`, // 10% alpha
    amber: `${colors.status.warning}1A`,
    red: `${colors.status.error}1A`,
    grey: colors.cardAlt,
  };
  const dotColor = fgByState[state];

  return (
    <View
      accessibilityLabel={`Companion status: ${label}`}
      style={[styles.chip, { backgroundColor: bgByState[state] }]}
    >
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.label, { color: fgByState[state] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
