// components/journey/session/HelpPanel.tsx
//
// The help sheet's content: what's on this card, plainly. For checked
// activities it offers "Show me" — assistance that the session records
// honestly (helped answers never count as recall).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../context';
import { MobilePrimaryButton } from '../../MobilePremium';
import { getPassageWord } from '../../../utils/journey';
import type { SessionActivity } from '../../../utils/journey';
import { LABEL_TRACKING } from '../tokens';

export interface HelpPanelProps {
  activity: SessionActivity | null;
  assisted: boolean;
  /** Records assistance for the current checked activity. */
  onUseHelp: () => void;
}

function activityWordKeys(activity: SessionActivity): string[] {
  switch (activity.kind) {
    case 'phrase-reveal':
      return activity.wordKeys;
    case 'meaning-choice':
      return activity.wordKey ? [activity.wordKey] : [];
    case 'phrase-builder':
      return activity.wordKeys;
    case 'passage-return':
      return activity.highlightWordKeys;
    case 'recap':
      return [];
  }
}

export function HelpPanel({ activity, assisted, onUseHelp }: HelpPanelProps) {
  const { colors } = useAppTheme();
  const score = colors.score;
  if (!activity) {
    return (
      <Text style={[styles.note, { color: score.inkTertiary }]}>Nothing to help with yet.</Text>
    );
  }

  const scored = activity.kind === 'meaning-choice' || activity.kind === 'phrase-builder';

  return (
    <View>
      <Text style={[styles.intro, { color: score.inkSecondary }]}>
        {activity.kind === 'phrase-reveal' &&
          'This card is a meeting, not a test. Read the phrase, its meaning, and the note about what to notice.'}
        {activity.kind === 'meaning-choice' &&
          'Pick the meaning, then press Check. Wrong picks aren’t punished — they change when this comes back.'}
        {activity.kind === 'phrase-builder' &&
          'Tap the words in order, then press Check. Tap a placed word to take it back.'}
        {activity.kind === 'passage-return' &&
          'This is reading, not recall. Highlighted words are the ones you’ve been practising.'}
        {activity.kind === 'recap' && 'The session’s quiet end — what you practised, nothing more.'}
      </Text>

      {activityWordKeys(activity).length > 0 && (
        <View style={styles.wordList}>
          {activityWordKeys(activity).map((wordKey) => {
            const word = getPassageWord(wordKey);
            if (!word) return null;
            return (
              <View key={wordKey} style={[styles.wordRow, { borderBottomColor: score.rule }]}>
                <Text style={[styles.wordForm, { color: score.ink }]}>{word.lemma}</Text>
                <Text style={[styles.wordMeaning, { color: score.inkSecondary }]}>
                  {word.meaning}
                  {word.roleLabel ? ` — ${word.roleLabel}` : ''}
                </Text>
                {word.patternNote ? <Text style={[styles.wordPattern, { color: score.inkTertiary }]}>
                    {word.patternNote}
                  </Text> : null}
              </View>
            );
          })}
        </View>
      )}

      {scored && activity.kind === 'phrase-builder' ? <Text style={[styles.hint, { color: score.inkTertiary }]}>
          {activity.prompt} — that’s the sentence to build.
        </Text> : null}

      {scored && !assisted ? <View style={styles.helpAction}>
          <MobilePrimaryButton onPress={onUseHelp} variant="secondary" size="sm">
            Show me
          </MobilePrimaryButton>
          <Text style={[styles.helpActionNote, { color: score.inkTertiary }]}>
            Marks this card as helped — it will come back sooner.
          </Text>
        </View> : null}
      {scored && assisted ? <Text style={[styles.assistedNote, { color: score.warmNote }]}>
          Helped on this card — noted, without judgement.
        </Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 15, lineHeight: 22 } as const,
  wordList: { marginTop: 16 } as const,
  wordRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  } as const,
  wordForm: { fontSize: 18, fontWeight: '600' } as const,
  wordMeaning: { fontSize: 14, lineHeight: 20, marginTop: 2 } as const,
  wordPattern: { fontSize: 13, lineHeight: 19, marginTop: 2, fontStyle: 'italic' } as const,
  hint: { fontSize: 13, lineHeight: 19, marginTop: 14 } as const,
  helpAction: { marginTop: 16 } as const,
  helpActionNote: { fontSize: 12, lineHeight: 18, marginTop: 8 } as const,
  assistedNote: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
    fontWeight: '600',
  } as const,
  note: { fontSize: 14 } as const,
});

export default HelpPanel;
