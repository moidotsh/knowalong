// app/index.tsx
// KnowAlong home — the composition stream. Polished version: composition
// dots between nodes, inline word previews, daily progress woven in,
// enriched contextual sheet (study/listen/type/breakdown per node),
// mistake indicators, + a generated "Practice" quick action.

import React, { useState, useCallback, useRef, useEffect } from 'react';
// c2-exempt: bottom sheet pattern — raw RN Modal drives the contextual sheet below.
import { Pressable, ScrollView, StyleSheet, Text, View, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import {
  navigateToStudy, navigateToSettings, navigateToConcept, navigateToLessons,
  navigateToSongs, navigateToConversation, navigateToProgress, navigateToMistakes,
  navigateToDeck,
} from '../navigation';
import { LEARNING_ITEMS, type LearningItem } from '../utils/knowalong/fixtures/learningItems';
import { ITEM_ICONS } from '../utils/knowalong/icons';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { useStreakStore } from '../stores/streakStore';
import { useLessonProgressStore } from '../stores/lessonProgressStore';
import { nextLessonAudioTexts } from '../utils/knowalong/progress';
import { prefetchAudio } from '../utils/knowalong/tts';
import { SCREEN_BODY_STYLE } from '../constants';

type NodeState = 'mastered' | 'in-progress' | 'locked';
const DAILY_GOAL = 10;

interface StreamNode { item: LearningItem; state: NodeState }

function buildStream(masteredCount: number): StreamNode[] {
  return LEARNING_ITEMS.map((item, i) => ({
    item,
    state: i < masteredCount ? 'mastered' as NodeState : i === masteredCount ? 'in-progress' as NodeState : 'locked' as NodeState,
  }));
}

function mc(colors: ReturnType<typeof useAppTheme>['colors'], state: NodeState): string {
  return state === 'mastered' ? colors.status.success : state === 'in-progress' ? colors.brand : colors.textMuted;
}

// Composition connector — a small dot with a line, showing parent → child.
function Connector({ color, height = 18 }: { color: string; height?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height }}>
      <View style={{ width: 2, flex: 1, backgroundColor: color + '25' }} />
      <View style={{ position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: color + '50' }} />
    </View>
  );
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const conceptsMastered = useStreakStore((s) => s.conceptsMastered);
  const streakDays = useStreakStore((s) => s.getStreak(5).streak);
  const mistakeCodes = useStreakStore((s) => s.mistakeCodes);
  const sessionsToday = useStreakStore((s) => s.totalSessions);
  const completedLessonIds = useLessonProgressStore((s) => s.completedLessonIds);
  const [selectedNode, setSelectedNode] = useState<StreamNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView>(null);

  const masteredCount = Math.max(3, conceptsMastered);
  const stream = buildStream(masteredCount);
  const growNext = stream.find((n) => n.state === 'in-progress') ?? stream.find((n) => n.state === 'locked');
  const masteredNodes = stream.filter((n) => n.state === 'mastered');
  const upcomingNodes = stream.filter((n) => n.state !== 'mastered').slice(0, 4);
  const dailyProgress = Math.min(sessionsToday % DAILY_GOAL, DAILY_GOAL);
  const dailyMet = sessionsToday > 0 && dailyProgress >= DAILY_GOAL;

  // Scroll to bottom on mount (where the action is)
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 100);
    return () => clearTimeout(t);
  }, []);

  // Returning users (Piper model already cached): pre-warm the first cards of
  // the next incomplete lesson across decks, so whatever they open next is
  // instant. First-timers (conceptsMastered === 0) are skipped — their first
  // lesson's loading gate handles prefetch, avoiding a surprise download.
  useEffect(() => {
    if (conceptsMastered === 0) return;
    const texts = nextLessonAudioTexts(completedLessonIds);
    if (texts.length) void prefetchAudio(texts);
  }, [conceptsMastered, completedLessonIds]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />

      {/* Header — streak + daily progress + settings */}
      <View style={styles.header}>
        <Pressable onPress={() => navigateToProgress()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ConceptIcon name="flame" size={16} color={colors.status.warning} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.status.warning }}>{streakDays}</Text>
        </Pressable>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>
          {dailyMet ? 'Goal met ✓' : `${dailyProgress}/${DAILY_GOAL} today`}
        </Text>
        <Pressable onPress={navigateToSettings} hitSlop={8}>
          <ConceptIcon name="user" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Daily progress bar — subtle, integrated */}
      <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
        <View style={{ height: 3, borderRadius: 1.5, backgroundColor: 'rgba(128,128,128,0.12)' }}>
          <View style={{ height: '100%', borderRadius: 1.5, width: `${(dailyProgress / DAILY_GOAL) * 100}%`, backgroundColor: dailyMet ? colors.status.success : colors.brand }} />
        </View>
      </View>

      <ScrollView ref={scrollRef} style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80 }}>

        {/* Mastered stream */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {masteredNodes.length} grown
        </Text>

        {masteredNodes.map((node, i) => {
          const c = mc(colors, node.state);
          const isMistake = mistakeCodes.includes(node.item.id);
          const isExpanded = expandedNodes.has(node.item.id);
          const nextMastered = masteredNodes[i + 1];
          return (
            <View key={node.item.id}>
              <Pressable onPress={() => toggleExpand(node.item.id)} onLongPress={() => setSelectedNode(node)}>
                <View style={[styles.nodeCard, { backgroundColor: c + '08', borderColor: c + '20' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {/* Left accent bar */}
                    <View style={{ width: 3, height: 36, borderRadius: 2, backgroundColor: c }} />
                    <ConceptIcon name={ITEM_ICONS[node.item.id] ?? 'star'} size={22} color={c} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{node.item.surfaceForm}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{node.item.meaning}</Text>
                    </View>
                    {isMistake ? (
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.status.error }} />
                    ) : null}
                    <ConceptIcon name={isExpanded ? 'check' : 'book'} size={14} color={colors.textMuted} />
                  </View>

                  {/* Expanded word breakdown */}
                  {isExpanded ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingLeft: 15 }}>
                      {node.item.words.map((w, wi) => (
                        <View key={wi} style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.cardAlt }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{w.form}</Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted }}>{w.gloss}</Text>
                        </View>
                      ))}
                      {node.item.contextSentence ? (
                        <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 4, width: '100%' }}>
                          {node.item.contextSentence.ru}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </Pressable>

              {/* Composition connector */}
              {nextMastered ? <Connector color={c} /> : null}
            </View>
          );
        })}

        {/* Grow next */}
        {growNext ? (
          <View>
            {masteredNodes.length > 0 ? <Connector color={colors.brand} height={24} /> : null}

            <Pressable onPress={() => navigateToStudy()}>
              <View style={[styles.growCard, { backgroundColor: colors.brand + '0A', borderColor: colors.brand + '40' }]}>
                <Text style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>
                  {growNext.state === 'in-progress' ? 'Continue growing' : 'Grow next'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  <ConceptIcon name={ITEM_ICONS[growNext.item.id] ?? 'star'} size={36} color={colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>{growNext.item.surfaceForm}</Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>{growNext.item.meaning}</Text>
                  </View>
                </View>
                {growNext.item.buildsOn.length > 0 ? (
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
                    Builds on: {growNext.item.buildsOn.map(b => LEARNING_ITEMS.find(i => i.id === b)?.surfaceForm).filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  <View style={{ paddingVertical: 12, paddingHorizontal: 32, borderRadius: 24, backgroundColor: colors.brand }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textOnBrand }}>Start</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* Upcoming */}
        {upcomingNodes.length > 1 ? (
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>On the way</Text>
            {upcomingNodes.slice(1).map((node) => (
              <View key={node.item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, opacity: 0.5 }}>
                <ConceptIcon name={ITEM_ICONS[node.item.id] ?? 'star'} size={16} color={colors.textMuted} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>{node.item.surfaceForm}</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>· {node.item.meaning}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Quiet entry points */}
        <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Pressable onPress={() => navigateToLessons()}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Lessons</Text></Pressable>
          <Pressable onPress={() => navigateToDeck('svetofor')}><Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand }}>Светофор</Text></Pressable>
          <Pressable onPress={() => navigateToSongs()}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Songs</Text></Pressable>
          <Pressable onPress={() => navigateToConversation()}><Text style={{ fontSize: 13, color: colors.textSecondary }}>Conversation</Text></Pressable>
          {mistakeCodes.length > 0 ? (
            <Pressable onPress={() => navigateToMistakes()}><Text style={{ fontSize: 13, color: colors.status.error }}>Review ({mistakeCodes.length})</Text></Pressable>
          ) : null}
        </View>

      </ScrollView>

      {/* c2-exempt: bottom sheet pattern — enriched contextual sheet (raw RN Modal) */}
      <Modal visible={!!selectedNode} transparent animationType="slide" onRequestClose={() => setSelectedNode(null)}>
        <TouchableWithoutFeedback onPress={() => setSelectedNode(null)}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { backgroundColor: colors.background }]}>
                {selectedNode ? (
                  <>
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <ConceptIcon name={ITEM_ICONS[selectedNode.item.id] ?? 'star'} size={40} color={colors.brand} />
                      <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 8 }}>{selectedNode.item.surfaceForm}</Text>
                      <Text style={{ fontSize: 15, color: colors.textSecondary }}>{selectedNode.item.meaning}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 }}>{selectedNode.item.transliteration}</Text>
                    </View>

                    {[
                      { icon: 'brain' as const, label: 'Study (chip builder)', action: () => navigateToStudy() },
                      { icon: 'waves' as const, label: 'Listen', action: () => navigateToStudy() },
                      { icon: 'check' as const, label: 'Type (spelling)', action: () => navigateToStudy() },
                      { icon: 'book' as const, label: 'Breakdown', action: () => navigateToConcept(selectedNode.item.id) },
                    ].map((act, i, arr) => (
                      <Pressable
                        key={i}
                        onPress={() => { setSelectedNode(null); act.action(); }}
                        style={[styles.sheetAction, i === arr.length - 1 ? { borderBottomWidth: 0 } : null]}
                      >
                        <ConceptIcon name={act.icon} size={20} color={i === 0 ? colors.brand : colors.textSecondary} />
                        <Text style={{ fontSize: 15, fontWeight: i === 0 ? '600' : '500', color: i === 0 ? colors.text : colors.textSecondary, marginLeft: 12 }}>{act.label}</Text>
                      </Pressable>
                    ))}

                    <Pressable onPress={() => setSelectedNode(null)} style={[styles.sheetAction, { borderBottomWidth: 0 }]}>
                      <Text style={{ fontSize: 14, color: colors.textMuted, marginLeft: 32 }}>Close</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
        {/* c2-exempt: bottom sheet pattern (closing tag) */}
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 8,
  },
  nodeCard: {
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1.5,
  },
  growCard: {
    paddingVertical: 20, paddingHorizontal: 20, borderRadius: 18,
    borderWidth: 2,
  },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  sheetAction: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)',
  },
});
