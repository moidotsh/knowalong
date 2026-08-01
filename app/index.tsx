// app/index.tsx
// KnowAlong home — the composition stream. Phrases are nodes connected by
// composition lines. The learner's progress is how far the stream has grown.
// Mastered nodes are solid; the next-to-learn node pulses at the bottom.
// Everything else (practice, songs, grammar) is reached contextually.

import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Modal, TouchableWithoutFeedback } from 'react-native'; // c2-exempt: bottom sheet pattern, not centered dialog
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobilePrimaryButton } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { navigateToStudy, navigateToSettings, navigateToConcept, navigateToLessons, navigateToSongs, navigateToConversation, navigateToProgress } from '../navigation';
import { LEARNING_ITEMS, type LearningItem } from '../utils/knowalong/fixtures/learningItems';
import { ITEM_ICONS, type IconName } from '../utils/knowalong/icons';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { useStreakStore } from '../stores/streakStore';
import { ConfettiEffect } from '../components/Celebration/ConfettiEffect';

type NodeState = 'mastered' | 'in-progress' | 'locked';

interface StreamNode {
  item: LearningItem;
  state: NodeState;
}

// Build the stream from LEARNING_ITEMS + mastery state.
// The first 3 items are mastered, the 4th is in-progress, rest locked.
function buildStream(masteredCount: number): StreamNode[] {
  return LEARNING_ITEMS.map((item, i) => ({
    item,
    state: i < masteredCount ? 'mastered' : i === masteredCount ? 'in-progress' : 'locked',
  }));
}

function masteryColor(colors: ReturnType<typeof useAppTheme>['colors'], state: NodeState): string {
  if (state === 'mastered') return colors.status.success;
  if (state === 'in-progress') return colors.brand;
  return colors.textMuted;
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const conceptsMastered = useStreakStore((s) => s.conceptsMastered);
  const streakDays = useStreakStore((s) => s.getStreak(5).streak);
  const mistakeCodes = useStreakStore((s) => s.mistakeCodes);
  const [selectedNode, setSelectedNode] = useState<StreamNode | null>(null);

  // Mastered count from streak store (or default to 3 for prototype warmth)
  const masteredCount = Math.max(3, conceptsMastered);
  const stream = buildStream(masteredCount);

  // The "grow next" node = first in-progress or first locked whose prereqs are met
  const growNext = stream.find((n) => n.state === 'in-progress') ?? stream.find((n) => n.state === 'locked');
  const masteredNodes = stream.filter((n) => n.state === 'mastered');
  const upcomingNodes = stream.filter((n) => n.state === 'in-progress' || n.state === 'locked').slice(0, 3);

  const handleNodeTap = useCallback((node: StreamNode) => {
    if (node.state === 'locked') return; // locked nodes aren't tappable
    setSelectedNode(node);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="training" />

      {/* Tiny header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigateToProgress()}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.status.warning }}>
            {streakDays} day streak
          </Text>
        </Pressable>
        <Pressable onPress={navigateToSettings} hitSlop={8}>
          <ConceptIcon name="user" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 }}>

        {/* Mastered stream — phrases that have grown */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {masteredNodes.length} phrase{masteredNodes.length === 1 ? '' : 's'} grown
        </Text>

        {masteredNodes.map((node, i) => {
          const mc = masteryColor(colors, node.state);
          const isMistake = mistakeCodes.includes(node.item.id);
          const nextNode = masteredNodes[i + 1];
          return (
            <View key={node.item.id}>
              {/* Node */}
              <Pressable onPress={() => handleNodeTap(node)}>
                <View style={[styles.nodeCard, { backgroundColor: mc + '0D', borderColor: mc + '30', borderLeftColor: mc, borderLeftWidth: 3 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ConceptIcon name={ITEM_ICONS[node.item.id] ?? 'star'} size={26} color={mc} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{node.item.surfaceForm}</Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{node.item.meaning}</Text>
                    </View>
                    {isMistake ? (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.status.error }} />
                    ) : null}
                  </View>
                </View>
              </Pressable>
              {/* Composition line to next node */}
              {nextNode ? (
                <View style={{ alignItems: 'center', paddingVertical: 2 }}>
                  <View style={{ width: 2, height: 16, backgroundColor: mc + '30' }} />
                </View>
              ) : null}
            </View>
          );
        })}

        {/* Grow next — the pulsing action node */}
        {growNext ? (
          <View style={{ marginTop: masteredNodes.length > 0 ? 8 : 0 }}>
            {masteredNodes.length > 0 ? (
              <View style={{ alignItems: 'center', paddingBottom: 4 }}>
                <View style={{ width: 2, height: 12, backgroundColor: colors.brand + '30', borderStyle: 'dashed' }} />
              </View>
            ) : null}

            <Pressable onPress={() => navigateToStudy()}>
              <View style={[styles.growNextCard, { backgroundColor: colors.brand + '0D', borderColor: colors.brand + '50' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <ConceptIcon name={ITEM_ICONS[growNext.item.id] ?? 'star'} size={32} color={colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {growNext.state === 'in-progress' ? 'Continue' : 'Learn next'}
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 2 }}>{growNext.item.surfaceForm}</Text>
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>{growNext.item.meaning}</Text>
                  </View>
                  <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.brand }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textOnBrand }}>Grow →</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* Upcoming preview — faint outlines */}
        {upcomingNodes.length > 1 ? (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Upcoming</Text>
            {upcomingNodes.slice(1).map((node) => (
              <View key={node.item.id} style={[styles.upcomingCard, { borderColor: colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ConceptIcon name={ITEM_ICONS[node.item.id] ?? 'star'} size={20} color={colors.textMuted} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textMuted }}>{node.item.surfaceForm}</Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>· {node.item.meaning}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Contextual entry points — not tiles, just quiet text links */}
        <View style={{ marginTop: 28, flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
          <Pressable onPress={() => navigateToLessons()}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Lessons</Text>
          </Pressable>
          <Pressable onPress={() => navigateToSongs()}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Songs</Text>
          </Pressable>
          <Pressable onPress={() => navigateToConversation()}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Conversation</Text>
          </Pressable>
          <Pressable onPress={() => navigateToProgress()}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Progress</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Contextual node sheet — // c2-exempt: bottom sheet, not centered dialog. MobileDialog is a centered modal; the stream's contextual sheet is a slide-up panel. */}
      <Modal visible={!!selectedNode} transparent animationType="slide" onRequestClose={() => setSelectedNode(null)}> // c2-exempt: bottom sheet pattern
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
                    </View>

                    <Pressable onPress={() => { setSelectedNode(null); navigateToStudy(); }} style={styles.sheetAction}>
                      <ConceptIcon name="brain" size={20} color={colors.brand} />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginLeft: 12 }}>Study this phrase</Text>
                    </Pressable>

                    <Pressable onPress={() => { setSelectedNode(null); navigateToConcept(selectedNode.item.id); }} style={styles.sheetAction}>
                      <ConceptIcon name="book" size={20} color={colors.textSecondary} />
                      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginLeft: 12 }}>See breakdown</Text>
                    </Pressable>

                    <Pressable onPress={() => setSelectedNode(null)} style={[styles.sheetAction, { borderBottomWidth: 0 }]}>
                      <ConceptIcon name="check" size={20} color={colors.textMuted} />
                      <Text style={{ fontSize: 15, color: colors.textSecondary, marginLeft: 12 }}>Close</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 10, marginTop: 4,
  },
  nodeCard: {
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1.5,
  },
  growNextCard: {
    paddingVertical: 20, paddingHorizontal: 18, borderRadius: 16,
    borderWidth: 2,
  },
  upcomingCard: {
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10,
    borderWidth: 1, borderStyle: 'dashed', marginBottom: 6,
  },
  sheetOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32,
  },
  sheetAction: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)',
  },
});
