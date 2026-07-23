// components/knowalong/ClccRealizationProposal.tsx
// Specialized proposal card for CLCC realization proposals. Accept is
// DISABLED per the matrix (promotion into concept_realizations is deferred
// for this checkpoint). Edit, reject, and JSON export remain enabled.

import React, { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { MobileSurface, MobilePrimaryButton } from '../MobilePremium';
import { useAppTheme } from '../../context';
import { useReviewProposal } from '../../hooks';
import type { AnalysisProposal } from '../../shared/types/knowalong';

interface Props {
  proposal: AnalysisProposal;
  runId: string;
}

export function ClccRealizationProposal({ proposal, runId }: Props) {
  const { colors } = useAppTheme();
  const reviewMutation = useReviewProposal();
  const [editing, setEditing] = useState(false);
  const [draftNote, setDraftNote] = useState('');

  const realization = useMemo(() => {
    const p = (proposal.editedPayload ?? proposal.payload) as Record<string, unknown>;
    return {
      coreConceptCode: String(p.coreConceptCode ?? ''),
      realizationType: String(p.realizationType ?? ''),
      surfaceForm: String(p.surfaceForm ?? ''),
      gloss: String(p.gloss ?? ''),
      grammaticalNote: String(p.grammaticalNote ?? ''),
      senseKind: String(p.senseKind ?? ''),
    };
  }, [proposal]);

  const onExport = () => {
    const json = JSON.stringify(
      {
        proposalId: proposal.id,
        proposalKind: proposal.proposalKind,
        ordinal: proposal.ordinal,
        reviewStatus: proposal.reviewStatus,
        payload: proposal.editedPayload ?? proposal.payload,
      },
      null,
      2,
    );
    Share.share({ title: `realization-${proposal.ordinal}`, message: json }).catch(() => {
      // Share may reject on web; ignore silently — the caller can copy from devtools.
    });
  };

  const onReject = () => {
    reviewMutation.mutate({
      runId,
      proposalId: proposal.id,
      action: 'reject',
      reviewerNote: draftNote || undefined,
    });
    setEditing(false);
  };

  const onSaveEdit = () => {
    reviewMutation.mutate({
      runId,
      proposalId: proposal.id,
      action: 'edit',
      editedPayload: proposal.payload,
      reviewerNote: draftNote || undefined,
    });
    setEditing(false);
  };

  return (
    <MobileSurface padding={12}>
      <View style={styles.headerRow}>
        <Text style={[styles.kindLabel, { color: colors.textSecondary }]}>
          Realization · #{proposal.ordinal}
        </Text>
        <Text style={[styles.statusPill, { color: colors.status.warning }]}>
          {proposal.reviewStatus}
        </Text>
      </View>
      <Text style={[styles.conceptCode, { color: colors.brand }]}>
        {realization.coreConceptCode}
      </Text>
      <Text style={[styles.surfaceForm, { color: colors.text }]}>{realization.surfaceForm}</Text>
      {realization.gloss ? (
        <Text style={[styles.gloss, { color: colors.textSecondary }]}>{realization.gloss}</Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={[styles.metaItem, { color: colors.textMuted }]}>
          type: {realization.realizationType || '—'}
        </Text>
        <Text style={[styles.metaItem, { color: colors.textMuted }]}>
          sense: {realization.senseKind || '—'}
        </Text>
      </View>
      {realization.grammaticalNote ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {realization.grammaticalNote}
        </Text>
      ) : null}

      {editing ? (
        <View style={styles.editBlock}>
          <TextInput
            accessibilityLabel="Reviewer note"
            placeholder="Optional note (visible to you only)"
            placeholderTextColor={colors.textMuted}
            value={draftNote}
            onChangeText={setDraftNote}
            multiline
            style={[
              styles.noteInput,
              {
                color: colors.text,
                borderColor: colors.cardAlt,
                backgroundColor: colors.backgroundDeep,
              },
            ]}
          />
          <View style={styles.editActionRow}>
            <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.ghostBtn}>
              <Text style={[styles.ghostBtnLabel, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onSaveEdit}
              style={[styles.ghostBtn, { borderColor: colors.brand }]}
            >
              <Text style={[styles.ghostBtnLabel, { color: colors.brand }]}>Save edit</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onReject}
              style={[styles.ghostBtn, { borderColor: colors.status.error }]}
            >
              <Text style={[styles.ghostBtnLabel, { color: colors.status.error }]}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setEditing(true)}
            disabled={proposal.reviewStatus !== 'pending'}
            style={({ pressed }) => [
              styles.ghostBtn,
              { borderColor: colors.brand, opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.ghostBtnLabel, { color: colors.brand }]}>Edit / reject</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onExport}
            style={({ pressed }) => [
              styles.ghostBtn,
              { borderColor: colors.textSecondary, opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.ghostBtnLabel, { color: colors.textSecondary }]}>Export JSON</Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.deferredNotice, { color: colors.textMuted }]}>
        deferred — Realization promotion into concept_realizations is deferred for this checkpoint.
      </Text>
    </MobileSurface>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kindLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusPill: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  conceptCode: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  surfaceForm: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  gloss: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  metaItem: {
    fontSize: 11,
  },
  note: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  editBlock: {
    gap: 10,
    marginTop: 10,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    fontSize: 13,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  ghostBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  ghostBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  deferredNotice: {
    fontSize: 11,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
