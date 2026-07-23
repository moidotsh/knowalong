// utils/domMeasurement.ts
// Shared DOM measurement utilities for consistent element dimension
// detection. Used by useContainerQuery and the Responsive layer.

import { isWeb, hasWindow } from './platform';

/**
 * Measure the dimensions of a DOM element. Works on both web and native.
 *
 * @returns Object with width and height, or zeros if element is null.
 */
export function measureElement(element: any): { width: number; height: number } {
  if (!element) {
    return { width: 0, height: 0 };
  }

  let width = 0;
  let height = 0;

  if (isWeb && hasWindow()) {
    // Web: prefer getBoundingClientRect for sub-pixel accuracy.
    const rect = element.getBoundingClientRect?.();
    if (rect) {
      width = rect.width;
      height = rect.height;
    } else {
      width = element.offsetWidth || 0;
      height = element.offsetHeight || 0;
    }
  } else {
    // Native: clientWidth/clientHeight from the RN View's host node.
    width = element.clientWidth || 0;
    height = element.clientHeight || 0;
  }

  return { width, height };
}
