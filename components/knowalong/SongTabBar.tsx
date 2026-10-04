// components/knowalong/SongTabBar.tsx
//
// The song-first shell's bottom chrome (design doc §1.1): the four surfaces —
// Today / My Songs / Words / Profile — flanking the raised play verb.
// A thin domain port of the kit's MobileTabBar (which owns no routing): this
// file is the one place that decides what the tabs and the center action do.
//
//   • Tab movement uses the NavigationHelper `switchTo*` helpers
//     (router.replace) so the back gesture never replays tab history.
//   • The center action opens the song's next useful passage (arc or
//     culminating line) resolved by the same generator the deck runtime
//     plays. A brand-new learner sees START — the cold-start scaffolding
//     makes the first arc playable with zero mastery; a returning learner
//     sees RESUME with the pulse.

import React, { useMemo } from 'react';
import { Languages, Music, Play, Sun, User } from '@tamagui/lucide-icons-2';
import { MobileTabBar, type MobileTabBarItem } from '../MobilePremium';
import { useAppTheme } from '../../context';
import {
  navigateToLesson,
  navigateToStudy,
  switchToProfile,
  switchToSongs,
  switchToToday,
  switchToWords,
} from '../../navigation';
import { useWordMasteryStore } from '../../stores/wordMasteryStore';
import { useLessonProgressStore } from '../../stores/lessonProgressStore';
import { nextDemoPassage } from '../../utils/knowalong/song/selectors';

export type SongTabId = 'today' | 'songs' | 'words' | 'profile';

export function SongTabBar({ activeId }: { activeId: SongTabId }) {
  const { colors } = useAppTheme();
  const mastery = useWordMasteryStore((s) => s.mastery);
  const completedLessonIds = useLessonProgressStore((s) => s.completedLessonIds);

  const next = useMemo(() => nextDemoPassage(mastery, completedLessonIds), [mastery, completedLessonIds]);
  const hasRun = completedLessonIds.length > 0;

  const tab = (id: SongTabId, label: string, Icon: typeof Sun, onPress: () => void): MobileTabBarItem => ({
    id,
    label,
    icon: <Icon size={19} color={activeId === id ? colors.text : colors.textMuted} />,
    onPress,
  });

  return (
    <MobileTabBar
      items={[
        tab('today', 'TODAY', Sun, switchToToday),
        tab('songs', 'SONGS', Music, switchToSongs),
        tab('words', 'WORDS', Languages, switchToWords),
        tab('profile', 'PROFILE', User, switchToProfile),
      ]}
      activeId={activeId}
      centerAction={{
        label: next ? `Play the next ${next.sectionLabel} passage` : 'Start studying',
        icon: <Play size={22} color={colors.textOnBrand} fill={colors.textOnBrand} />,
        onPress: () => (next ? navigateToLesson(next.lessonId) : navigateToStudy()),
        active: hasRun,
      }}
      testID="song-tab-bar"
    />
  );
}

export default SongTabBar;
