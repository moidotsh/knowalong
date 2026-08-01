// utils/knowalong/icons.ts
//
// Maps learning concepts to clean Lucide line icons (via
// @tamagui/lucide-icons-2) instead of emoji. Each concept gets a named
// icon; the study/home/progress/achievements pages resolve the name to
// the component. Flat, consistent, professional — no more ugly emoji.

import {
  User, Eye, Brain, Heart, Home, Footprints, Coffee,
  HandHeart, Waves, HelpCircle, X, Star, Flame, Trophy,
  BookOpen, GraduationCap, Lock, CheckCircle, Target, Sparkles,
} from '@tamagui/lucide-icons-2';

type IconComponent = typeof User;

export type IconName =
  | 'user' | 'eye' | 'brain' | 'heart' | 'home' | 'footprints'
  | 'coffee' | 'hand-heart' | 'waves' | 'help-circle' | 'x'
  | 'star' | 'flame' | 'trophy' | 'book' | 'graduation' | 'lock'
  | 'check' | 'target' | 'sparkles';

const ICON_MAP: Record<IconName, IconComponent> = {
  'user': User,
  'eye': Eye,
  'brain': Brain,
  'heart': Heart,
  'home': Home,
  'footprints': Footprints,
  'coffee': Coffee,
  'hand-heart': HandHeart,
  'waves': Waves,
  'help-circle': HelpCircle,
  'x': X,
  'star': Star,
  'flame': Flame,
  'trophy': Trophy,
  'book': BookOpen,
  'graduation': GraduationCap,
  'lock': Lock,
  'check': CheckCircle,
  'target': Target,
  'sparkles': Sparkles,
};

export function getIcon(name: IconName): IconComponent {
  return ICON_MAP[name] ?? Star;
}

/** Map a learning-item id to its icon name. */
export const ITEM_ICONS: Record<string, IconName> = {
  '1': 'user',        // я — I
  '2': 'eye',         // я вижу — I see
  '3': 'brain',       // я знаю — I know
  '4': 'hand-heart',  // я хочу — I want
  '5': 'footprints',  // я иду — I am going
  '6': 'home',        // я живу — I live
  '7': 'heart',       // мне нравится — I like
  '8': 'help-circle', // я не знаю — I don't know
  '9': 'waves',       // я вижу море — I see the sea
  '10': 'coffee',     // я хочу чай — I want tea
};

/** Achievement icon names. */
export const ACHIEVEMENT_ICONS: Record<string, IconName> = {
  'first-step': 'footprints',
  'streak-3': 'flame',
  'streak-7': 'flame',
  'streak-30': 'trophy',
  'concepts-5': 'brain',
  'concepts-10': 'graduation',
  'concepts-25': 'book',
  'lesson-1': 'book',
  'lesson-3': 'sparkles',
  'sessions-10': 'star',
  'sessions-50': 'star',
  'sessions-100': 'trophy',
};
