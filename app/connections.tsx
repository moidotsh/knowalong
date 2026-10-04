// app/connections.tsx
// The CLCC composition map — a visual tree showing how phrases build from
// atoms. "я" is the root → "я вижу" branches from it → "я вижу море"
// branches from that. Interactive: tap any node to see its breakdown.
// This is KnowAlong's signature visual — no other language app shows how
// sentences compose from learned primitives.

import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MobileAtmosphere, MobileSurface, MobileHeader } from '../components/MobilePremium';
import { useAppTheme } from '../context';
import { safeGoBack, navigateToStudy, navigateToConcept } from '../navigation';
import { SCREEN_BODY_STYLE, theme } from '../constants';
import { LEARNING_ITEMS } from '../utils/knowalong/fixtures/learningItems';
import { ConceptIcon } from '../components/knowalong/ConceptIcon';
import { ITEM_ICONS } from '../utils/knowalong/icons';

interface TreeNode {
  id: string;
  surfaceForm: string;
  meaning: string;
  depth: number;
  parentId: string | null;
  children: string[];
}

// Build the tree from LEARNING_ITEMS' buildsOn relationships.
function buildTree(): TreeNode[] {
  const nodes: TreeNode[] = LEARNING_ITEMS.map((item) => ({
    id: item.id,
    surfaceForm: item.surfaceForm,
    meaning: item.meaning,
    depth: 0,
    parentId: item.buildsOn[item.buildsOn.length - 1] ?? null,
    children: [],
  }));
  // Compute children + depth
  for (const node of nodes) {
    if (node.parentId) {
      const parent = nodes.find((n) => n.id === node.parentId);
      parent?.children.push(node.id);
    }
  }
  // Root items (no parent) get depth 0; children inherit parent.depth + 1
  function setDepth(id: string, d: number) {
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    n.depth = d;
    n.children.forEach((c) => setDepth(c, d + 1));
  }
  nodes.filter((n) => !n.parentId).forEach((root) => setDepth(root.id, 0));
  // Sort by depth then id
  return nodes.sort((a, b) => a.depth - b.depth || Number(a.id) - Number(b.id));
}

const MAX_DEPTH = 3;

export default function ConnectionsScreen() {
  const { colors } = useAppTheme();
  const tree = buildTree();
  const [selected, setSelected] = useState<string | null>(null);

  const selectedItem = selected ? LEARNING_ITEMS.find((i) => i.id === selected) : null;
  const children = selected ? tree.filter((n) => n.parentId === selected) : [];

  // Group by depth for rendering
  const byDepth: TreeNode[][] = [];
  for (let d = 0; d <= MAX_DEPTH; d++) {
    byDepth.push(tree.filter((n) => n.depth === d));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundDeep }} edges={['top', 'bottom']}>
      <MobileAtmosphere surface="analytics" />
      <MobileHeader title="Composition map" eyebrow="How phrases build" onBack={safeGoBack} />
      <ScrollView style={SCREEN_BODY_STYLE} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 }}>

        <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary, marginBottom: 16 }}>
          Every phrase is built from simpler ones. Tap a node to see what it connects to.
        </Text>

        {/* Depth levels */}
        {byDepth.map((level, depth) => {
          if (level.length === 0) return null;
          return (
            <View key={depth} style={{ marginBottom: 12 }}>
              {/* Connector line */}
              {depth > 0 ? (
                <View style={{ height: 20, justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ width: 1, height: 20, backgroundColor: colors.cardBorder }} />
                </View>
              ) : null}

              {/* Depth label */}
              <Text style={{ ...theme.typography.mobileEyebrow, color: colors.textMuted, marginBottom: 8 }}>
                {depth === 0 ? 'Atoms' : depth === 1 ? 'Person + verb' : depth === 2 ? 'Phrases' : 'Sentences'}
              </Text>

              {/* Nodes at this depth */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {level.map((node) => {
                  const isSel = selected === node.id;
                  const item = LEARNING_ITEMS.find((i) => i.id === node.id);
                  return (
                    <Pressable key={node.id} onPress={() => setSelected(isSel ? null : node.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${node.surfaceForm} — ${node.meaning}`}
                      accessibilityState={{ selected: isSel }}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                      <View style={{
                        paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 2,
                        borderColor: isSel ? colors.brand : colors.cardBorder,
                        backgroundColor: isSel ? colors.brand + '12' : colors.cardAlt,
                        alignItems: 'center', minWidth: 72,
                      }}>
                        {ITEM_ICONS[node.id] ? (
                          <View style={{ marginBottom: 4 }}>
                            <ConceptIcon name={ITEM_ICONS[node.id]} size={22} color={colors.brand} />
                          </View>
                        ) : null}
                        <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 16, lineHeight: 20, fontFamily: theme.fonts.display, color: colors.text }}>{node.surfaceForm}</Text>
                        <Text style={{ ...theme.typography.mobileLedger, fontSize: 10, lineHeight: 13, color: colors.textMuted, marginTop: 3 }}>{node.meaning}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Selected detail */}
        {selectedItem ? (
          <View style={{ marginTop: 16 }}>
            <MobileSurface padding={18}>
              <Pressable onPress={() => navigateToConcept(selectedItem.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${selectedItem.surfaceForm} details`}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {ITEM_ICONS[selectedItem.id] ? (
                    <ConceptIcon name={ITEM_ICONS[selectedItem.id]} size={32} color={colors.brand} />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 20, lineHeight: 26, fontFamily: theme.fonts.display, color: colors.text }}>{selectedItem.surfaceForm}</Text>
                    <Text style={{ ...theme.typography.mobileBody, color: colors.textSecondary, marginTop: 2 }}>{selectedItem.meaning}</Text>
                  </View>
                  <Text style={{ ...theme.typography.mobileEyebrow, color: colors.brand }}>Detail →</Text>
                </View>
              </Pressable>

              {/* Word breakdown */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {selectedItem.words.map((w, i) => (
                  <View key={i} style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.cardBorder + '40' }}>
                    <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 13, lineHeight: 17, color: colors.text }}>{w.form}</Text>
                    <Text style={{ ...theme.typography.mobileLedger, fontSize: 10, lineHeight: 13, color: colors.textMuted }}>{w.gloss}</Text>
                  </View>
                ))}
              </View>

              {/* Builds on */}
              {selectedItem.buildsOn.length > 0 ? (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ ...theme.typography.mobileEyebrow, fontSize: 10, lineHeight: 14, color: colors.textMuted }}>Builds on:</Text>
                  {selectedItem.buildsOn.map((depId) => {
                    const dep = LEARNING_ITEMS.find((i) => i.id === depId);
                    return (
                      <Pressable key={depId} onPress={() => setSelected(depId)}
                        accessibilityRole="button"
                        accessibilityLabel={`Show ${dep?.surfaceForm ?? depId}`}
                        style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                        <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 13, lineHeight: 17, color: colors.status.success }}>{dep?.surfaceForm}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={{ ...theme.typography.mobileLedger, fontSize: 10, lineHeight: 14, color: colors.textMuted, marginTop: 10 }}>Root concept — everything builds from here.</Text>
              )}

              {/* Enables */}
              {children.length > 0 ? (
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Text style={{ ...theme.typography.mobileEyebrow, fontSize: 10, lineHeight: 14, color: colors.textMuted }}>Enables:</Text>
                  {children.map((c) => (
                    <Pressable key={c.id} onPress={() => setSelected(c.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${c.surfaceForm}`}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                      <Text style={{ ...theme.typography.mobileItemTitle, fontSize: 13, lineHeight: 17, color: colors.brand }}>{c.surfaceForm}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </MobileSurface>

            <Pressable onPress={() => navigateToStudy()} style={({ pressed }) => [{ marginTop: 8, opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Study this phrase">
              <MobileSurface padding={12}>
                <Text style={{ ...theme.typography.mobileEyebrow, color: colors.brand, textAlign: 'center', textTransform: 'uppercase' }}>Study this phrase →</Text>
              </MobileSurface>
            </Pressable>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}
