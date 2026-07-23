// components/knowalong/ProposalReviewBatch.tsx
// Batch reviewer: takes the current proposals list, lets the user
// multi-select, and accepts them in one batch. Per-proposal outcomes are
// surfaced (no all-or-nothing claim) — uses proposalReviewService via
// useReviewProposalBatch. Blocked and deferred proposals are skipped with
// a per-row explanation.

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MobileSurface, MobilePrimaryButton, MobileSectionEyebrow } from '../MobilePremium';
import { useAppTheme } from '../../context';
import { useAnalysisProposals, useReviewProposalBatch } from '../../hooks';
import type { AnalysisProposal, ProposalBatchOutcome } from '../../shared/types/knowalong';

interface Props {
  runId: string;
}

export function ProposalReviewBatch({ runId }: Props) {
  const { colors } = useAppTheme();
  const proposalsQuery = useAnalysisProposals(runId);
  const batchMutation = useReviewProposalBatch();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const checkColor = colors.textOnBrand;

  const pendingProposals = useMemo(
    () => (proposalsQuery.data ?? []).filter((p) => p.reviewStatus === 'pending'),
    [proposalsQuery.data],
  );

  const lastOutcomeById = useMemo(() => {
    const map = new Map<string, ProposalBatchOutcome>();
    const outcomes = batchMutation.data ?? [];
    for (const o of outcomes) {
      map.set(o.proposalId, o);
    }
    return map;
  }, [batchMutation.data]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onAcceptSelected = () => {
    if (selected.size === 0) return;
    batchMutation.mutate({ runId, proposalIds: Array.from(selected) });
  };

  return (
    <View>
      <MobileSectionEyebrow>Batch review ({pendingProposals.length} pending)</MobileSectionEyebrow>
      {pendingProposals.length === 0 ? (
        <MobileSurface padding={12}>
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No pending proposals to batch-accept.
          </Text>
        </MobileSurface>
      ) : (
        <MobileSurface padding={12}>
          <View style={styles.list}>
            {pendingProposals.map((p: AnalysisProposal) => {
              const isSelected = selected.has(p.id);
              const outcome = lastOutcomeById.get(p.id);
              return (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => toggle(p.id)}
                  style={[
                    styles.row,
                    {
                      borderColor: isSelected ? colors.brand : colors.cardAlt,
                      backgroundColor: isSelected ? colors.brandSoft : 'transparent',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isSelected ? colors.brand : colors.textMuted,
                        backgroundColor: isSelected ? colors.brand : 'transparent',
                      },
                    ]}
                  >
                    {isSelected ? (
                      <Text style={[styles.checkGlyph, { color: checkColor }]}>✓</Text>
                    ) : null}
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowKind, { color: colors.textSecondary }]}>
                      {p.proposalKind} · #{p.ordinal}
                    </Text>
                    {outcome ? (
                      <Text
                        style={[
                          styles.rowOutcome,
                          {
                            color:
                              outcome.status === 'accepted'
                                ? colors.status.success
                                : outcome.status === 'deferred' || outcome.status === 'blocked'
                                  ? colors.status.warning
                                  : colors.status.error,
                          },
                        ]}
                      >
                        {outcome.status}
                        {outcome.reason ? ` — ${outcome.reason}` : ''}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actionRow}>
            <MobilePrimaryButton
              onPress={onAcceptSelected}
              disabled={selected.size === 0 || batchMutation.isPending}
            >
              Accept {selected.size > 0 ? `(${selected.size})` : ''}
            </MobilePrimaryButton>
          </View>
        </MobileSurface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 13,
  },
  list: {
    gap: 6,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowBody: {
    flex: 1,
  },
  rowKind: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  rowOutcome: {
    fontSize: 11,
    marginTop: 2,
  },
  actionRow: {
    marginTop: 4,
  },
});
