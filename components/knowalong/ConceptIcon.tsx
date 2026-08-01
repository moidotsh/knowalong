// components/knowalong/ConceptIcon.tsx
// Renders a clean Lucide line icon for a learning concept (replaces emoji).
// Sized via the `size` prop; colored via the `color` prop (defaults to brand).

import React from 'react';
import { getIcon, type IconName } from '../../utils/knowalong/icons';
import { useAppTheme } from '../../context';

export function ConceptIcon({
  name,
  size = 32,
  color,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const { colors } = useAppTheme();
  const Icon = getIcon(name);
  return React.createElement(Icon as any, { size, color: color ?? colors.brand, strokeWidth });
}

export default ConceptIcon;
