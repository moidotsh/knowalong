// components/MobilePremium/showcase/demos/LangDemo.tsx
// The i18n seam demo — the typed bilingual catalog over the persisted lang
// store, toggled by the one-gesture pill.
import { Text, View } from 'react-native';
import { theme } from '../../../../constants';
import { useAppTheme } from '../../../../context';
import { createStringsCatalog, useLangStore } from '../../../../utils';
import { MobileSurface } from '../../MobileSurface';
import { LangToggle } from '../../LangToggle';
import { styles } from '../styles';

// ── The i18n seam demo ──────────────────────────────────────────────────
const LANG_DEMO = createStringsCatalog(
  {
    greeting: 'Welcome to the kit',
    cta: 'Start browsing',
    note: 'One tap re-renders every mounted surface — the catalog is typed, so a missing translation is a compile error.',
  },
  {
    fr: {
      greeting: 'Bienvenue dans le kit',
      cta: 'Parcourir',
      note: 'Un geste re-rend chaque surface montée — le catalogue est typé, une traduction manquante est une erreur de compilation.',
    },
  },
);

export function LangDemo() {
  const { colors } = useAppTheme();
  const t = LANG_DEMO.useT();
  const lang = useLangStore((s) => s.lang);
  return (
    <MobileSurface>
      <Text style={[styles.bodyText, { color: colors.textSecondary, marginBottom: 12 }]}>
        The typed bilingual catalog over the persisted lang store — the shell's opt-in i18n
        seam. Content is not chrome: catalogs carry UI strings only.
      </Text>
      <LangToggle />
      <View style={{ marginTop: 14 }}>
        <Text style={[theme.typography.mobileTitle, { color: colors.text, fontSize: 20 }]}>
          {t.greeting}
        </Text>
        <Text style={[styles.bodyText, { color: colors.textSecondary, marginTop: 6 }]}>
          {t.cta}. {t.note}
        </Text>
        <Text style={[styles.axisHint, { color: colors.textMuted, marginTop: 8 }]}>
          live lang: {lang} · persisted per browser · mirrors fall back to the source
          language
        </Text>
      </View>
    </MobileSurface>
  );
}
