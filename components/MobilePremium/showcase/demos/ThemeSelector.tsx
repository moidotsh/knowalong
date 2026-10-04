// components/MobilePremium/showcase/demos/ThemeSelector.tsx
// Light / dark / system preference chips — flips the whole showcase live.
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '../../../../context';
import { PREFERENCE_OPTIONS } from '../data';
import { styles } from '../styles';

export function ThemeSelector() {
  const { colors, preference, setPreference } = useAppTheme();
  return (
    <View style={styles.themeRow}>
      {PREFERENCE_OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <Pressable
            key={value}
            onPress={() => setPreference(value)}
            style={[
              styles.themeChip,
              {
                backgroundColor: active ? colors.brand : colors.card,
                borderColor: active ? colors.brand : colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Theme: ${label}`}
          >
            <Icon size={14} color={active ? colors.textOnBrand : colors.textSecondary} />
            <Text
              style={[
                styles.themeChipLabel,
                {
                  color: active ? colors.textOnBrand : colors.textSecondary,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
