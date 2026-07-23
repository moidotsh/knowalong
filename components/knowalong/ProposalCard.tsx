// components/knowalong/ProposalCard.tsx
// Per-proposal review card. Implements the acceptance-matrix rules from
// deliverable 3 (Revision 3):
//   - segment / token_occurrence / realization → Accept DISABLED with
//     "deferred — <reason>"
//   - line_translation without a line / morphology without a form /
//     concept_mapping without the Core Concept → Accept DISABLED with
//     "blocked — prerequisite missing"
//   - card with `generated_transfer` whose only target is a lexical form →
//     Accept DISABLED with "blocked — form is not a generated-card target
//     in this checkpoint."
//   - everything else → Accept enabled (single-row destinations per matrix).

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MobileSurface, MobilePrimaryButton } from '../MobilePremium';
import { useAppTheme } from '../../context';
import { useReviewProposal } from '../../hooks';
import type {
  AnalysisProposal,
  AnalysisProposalKind,
  DeferredAcceptanceKind,
} from '../../shared/types/knowalong';

interface Props {
  proposal: AnalysisProposal;
  runId: string;
}

const KIND_LABELS: Record<AnalysisProposalKind, string> = {
  section: 'Section',
  segment: 'Segment',
  line_translation: 'Line translation',
  token_occurrence: 'Token occurrence',
  lemma: 'Lemma',
  form: 'Form',
  morphology: 'Morphology',
  grammar_pattern: 'Grammar pattern',
  concept_mapping: 'Concept mapping',
  card: 'Card',
  realization: 'Realization',
};

const DEFERRED_REASONS: Record<DeferredAcceptanceKind, string> = {
  segment: 'Segment promotion is deferred until atomic multi-record promotion is available.',
  token_occurrence:
    'Token-occurrence promotion is deferred (the local pipeline populates token_occurrences differently).',
  realization: 'Realization promotion into concept_realizations is deferred for this checkpoint.',
};

function summarizeProposal(proposal: AnalysisProposal): string {
  const payload = (proposal.editedPayload ?? proposal.payload) as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = payload[k];
      if (typeof v === 'string' && v.length > 0) return v;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const child = v as Record<string, unknown>;
        for (const ck of ['normalizedLemma', 'surfaceForm', 'patternCode', 'label', 'gloss', 'coreConceptCode']) {
          if (typeof child[ck] === 'string') return String(child[ck]);
        }
      }
    }
    return '';
  };
  return (
    pick(
      'normalizedLemma',
      'surfaceForm',
      'patternCode',
      'coreConceptCode',
      'sectionType',
      'translation',
      'gloss',
      'label',
    ) || 'Proposal'
  );
}

/**
 * Compute the (possibly disabled) accept state for a proposal per the
 * acceptance matrix. Returns `{ disabled: true; reason: string }` for any
 * rule that blocks acceptance, or `{ disabled: false }` for proposals that
 * may be accepted (caller still re-checks the service-side result).
 */
function evaluateAcceptState(proposal: AnalysisProposal):
  | { disabled: true; reason: string }
  | { disabled: false } {
  const kind = proposal.proposalKind;
  const payload = (proposal.editedPayload ?? proposal.payload) as Record<string, unknown>;

  // Deferred kinds — segment / token_occurrence / realization.
  if (kind === 'segment' || kind === 'token_occurrence' || kind === 'realization') {
    return { disabled: true, reason: DEFERRED_REASONS[kind] };
  }

  // Prerequisite: line_translation requires a sourceLineId.
  if (kind === 'line_translation') {
    if (!payload.sourceLineId && !payload.sourceLineOrdinal) {
      return {
        disabled: true,
        reason: 'blocked — prerequisite missing (source line reference).',
      };
    }
  }

  // Prerequisite: morphology requires a form reference.
  if (kind === 'morphology') {
    if (!payload.formId && !payload.lemmaId) {
      return {
        disabled: true,
        reason: 'blocked — prerequisite missing (form or lemma reference).',
      };
    }
  }

  // Prerequisite: concept_mapping requires a coreConceptCode.
  if (kind === 'concept_mapping') {
    if (!payload.coreConceptCode) {
      return {
        disabled: true,
        reason: 'blocked — prerequisite missing (Core Concept code).',
      };
    }
  }

  // card with generated_transfer — form is NOT a target in this checkpoint.
  if (kind === 'card') {
    const cardKind = payload.cardKind ?? payload.kind;
    if (cardKind === 'generated_transfer') {
      const hasAllowedTarget =
        !!payload.lexicalLemmaId ||
        !!payload.targetCoreConceptId ||
        !!payload.targetRealizationId ||
        !!payload.grammarPatternId;
      const onlyTargetIsForm =
        !hasAllowedTarget && (!!payload.lexicalFormId || !!payload.formId);
      if (onlyTargetIsForm) {
        return {
          disabled: true,
          reason: 'blocked — form is not a generated-card target in this checkpoint.',
        };
      }
      if (!hasAllowedTarget) {
        return {
          disabled: true,
          reason: 'blocked — prerequisite missing (generated-transfer requires a target).',
        };
      }
    }
  }

  return { disabled: false };
}

export function ProposalCard({ proposal, runId }: Props) {
  const { colors } = useAppTheme();
  const reviewMutation = useReviewProposal();
  const [editing, setEditing] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  const summary = useMemo(() => summarizeProposal(proposal), [proposal]);
  const acceptState = useMemo(() => evaluateAcceptState(proposal), [proposal]);
  const isReviewActedOn =
    proposal.reviewStatus === 'accepted' ||
    proposal.reviewStatus === 'edited' ||
    proposal.reviewStatus === 'rejected' ||
    proposal.reviewStatus === 'superseded';

  const onAccept = () => {
    reviewMutation.mutate({ runId, proposalId: proposal.id, action: 'accept' });
  };
  const onReject = () => {
    reviewMutation.mutate({
      runId,
      proposalId: proposal.id,
      action: 'reject',
      reviewerNote: draftNote || undefined,
    });
    setEditing(false);
    setDraftNote('');
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
          {KIND_LABELS[proposal.proposalKind]} · #{proposal.ordinal}
        </Text>
        <Text
          style={[
            styles.statusPill,
            {
              color:
                proposal.reviewStatus === 'accepted'
                  ? colors.status.success
                  : proposal.reviewStatus === 'rejected' || proposal.reviewStatus === 'superseded'
                    ? colors.textMuted
                    : proposal.reviewStatus === 'edited'
                      ? colors.brand
                      : colors.status.warning,
            },
          ]}
        >
          {proposal.reviewStatus}
        </Text>
      </View>
      <Text style={[styles.summary, { color: colors.text }]} numberOfLines={3}>
        {summary}
      </Text>

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
            disabled={isReviewActedOn}
            style={({ pressed }) => [
              styles.ghostBtn,
              { borderColor: colors.brand, opacity: pressed || isReviewActedOn ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.ghostBtnLabel, { color: colors.brand }]}>Edit / reject</Text>
          </Pressable>
          <View style={styles.acceptColumn}>
            <MobilePrimaryButton
              variant="secondary"
              onPress={onAccept}
              disabled={acceptState.disabled || isReviewActedOn}
            >
              Accept
            </MobilePrimaryButton>
            {acceptState.disabled ? (
              <Text style={[styles.acceptNotice, { color: colors.textMuted }]}>
                {acceptState.reason}
              </Text>
            ) : null}
          </View>
        </View>
      )}
      {proposal.reviewerNote && !editing ? (
        <Text style={[styles.note, { color: colors.textMuted }]}>Note: {proposal.reviewerNote}</Text>
      ) : null}
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
  summary: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  acceptColumn: {
    flex: 1,
    gap: 4,
  },
  acceptNotice: {
    fontSize: 11,
    lineHeight: 14,
  },
  editBlock: {
    gap: 10,
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
  note: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
