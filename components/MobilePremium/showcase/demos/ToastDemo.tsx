// components/MobilePremium/showcase/demos/ToastDemo.tsx
// The four toast types, fired through the shell's toast context.
import { Pressable, Text, View } from 'react-native';
import { useAppTheme, useToast } from '../../../../context';
import { MobileSurface } from '../../MobileSurface';
import { styles } from '../styles';

export function ToastDemo() {
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const toastButtons: ReadonlyArray<{ type: 'success' | 'warning' | 'error' | 'info'; label: string }> = [
    { type: 'success', label: 'Success' },
    { type: 'warning', label: 'Warning' },
    { type: 'error', label: 'Error' },
    { type: 'info', label: 'Info' },
  ];
  return (
    <MobileSurface>
      <View style={styles.toastRow}>
        {toastButtons.map(({ type, label }) => (
          <Pressable
            key={type}
            onPress={() => showToast(type, `${label} toast — auto-dismisses in 4s.`)}
            style={[
              styles.toastChip,
              {
                backgroundColor: colors.buttonBackground,
                borderColor: colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Show ${label} toast`}
          >
            <Text style={[styles.toastChipLabel, { color: colors.textOnBrand }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </MobileSurface>
  );
}
