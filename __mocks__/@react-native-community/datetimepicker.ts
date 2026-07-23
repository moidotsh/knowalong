// Mock for @react-native-community/datetimepicker for vitest. Wired via
// resolve.alias in vitest.config.ts. Renders a placeholder host element
// so component tests can mount DatePickerField under jsdom without the
// native picker's iOS/Android UIKit/Material deps.

import React from 'react';

type AnyProps = Record<string, any>;

export type DateTimePickerEvent = { type: 'set' | 'dismissed' | 'neutral' };

export default function MockDateTimePicker(props: AnyProps) {
  return React.createElement('datetimepicker', props, props.children);
}
