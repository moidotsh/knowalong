// components/knowalong/MasterySummary.tsx
//
// Compact mastery overview for the Study results screen: how many words the
// learner has graduated / is learning / is struggling with, plus their worst
// issue words with streak progress toward graduation (e.g. "3/5"). Purely
// presentational — takes a summarizeMastery() result. Theme colors only.

import React from 'react';
import { Text, View } from 'react-native';
import { MobileSurface } from '../MobilePremium';
import { useAppTheme } from '../../context';
import { WORD_FADE_THRESHOLD, type MasterySummary as MasterySummaryData } from '../../utils/knowalong/mastery';

interface Props {
  summary: MasterySummaryData;
}

function Stat({ label, count, colorKey }: { label: string; count: number; colorKey: 'success' | 'brand' | 'error' }) {
  const { colors } = useAppTheme();
  const color = colorKey === 'brand' ? colors.brand : colors.status[colorKey];
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: color + '12' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color }}>{count}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}

export function MasterySummaryCard({ summary }: Props) {
  const { colors } = useAppTheme();
  return (
    <MobileSurface padding={16}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Your words</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat label="Known" count={summary.graduated} colorKey="success" />
        <Stat label="Learning" count={summary.learning} colorKey="brand" />
        <Stat label="Needs work" count={summary.issue} colorKey="error" />
      </View>

      {summary.issueWords.length > 0 ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          {summary.issueWords.map((w) => {
            const pct = Math.min(w.streak / WORD_FADE_THRESHOLD, 1) * 100;
            return (
              <View key={w.form}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{w.form}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{w.streak}/{WORD_FADE_THRESHOLD}</Text>
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.cardAlt, marginTop: 4 }}>
                  <View style={{ height: '100%', width: `${pct}%`, backgroundColor: colors.status.error, borderRadius: 2 }} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </MobileSurface>
  );
}
