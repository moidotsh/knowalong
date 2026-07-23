// hooks/useContainerQuery.ts
// Hook to measure actual container dimensions for responsive components.
// Returns width/height + size category + constrained/short flags.
//
// Standalone ResizeObserver (no shared pool). Fine for the typical PWA
// where each MobilePremium screen owns its container. Consumers adding
// per-screen ResizeObserver pooling should wrap this hook.

import { useState, useEffect, useCallback, useRef } from 'react';
import { isWeb, hasWindow, measureElement } from '../utils';
import {
  RESIZE_DEBOUNCE_MS,
  ContainerMeasurement,
  getContainerSize,
  isContainerConstrained,
  isContainerShort,
} from '../constants';

export type { ContainerMeasurement };

/**
 * Internal helper to compute container measurement info
 */
function computeContainerInfo(width: number, height: number): ContainerMeasurement {
  return {
    width,
    height,
    size: getContainerSize(width),
    isConstrained: isContainerConstrained(width),
    isShort: isContainerShort(height),
    aspectRatio: height > 0 ? width / height : 1,
  };
}

/**
 * Hook to measure container dimensions
 * Returns actual measured width/height and a size category.
 *
 * Usage:
 * ```tsx
 * const containerRef = useRef(null);
 * const { width, size, isConstrained } = useContainerQuery(containerRef);
 *
 * if (isConstrained) return <CompactView />;
 * return <FullView />;
 * ```
 */
export function useContainerQuery(
  containerRef: React.RefObject<any>,
  debounceMs: number = RESIZE_DEBOUNCE_MS,
): ContainerMeasurement {
  // Track if we've had our first real measurement (to avoid 0-width animation).
  const hasMeasuredRef = useRef(false);

  // State for container measurements — initialize with a reasonable default
  // to avoid the 0 → actual width animation on mount.
  const [containerInfo, setContainerInfo] = useState<ContainerMeasurement>((): ContainerMeasurement => ({
    width: 0,
    height: 0,
    size: 'comfortable',
    isConstrained: false,
    isShort: false,
    aspectRatio: 1,
  }));

  // Debounce timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measureContainer = useCallback(() => {
    if (!containerRef.current) return;

    const { width, height } = measureElement(containerRef.current);

    // Skip state update if we haven't measured yet and dimensions are 0.
    // This prevents the 0 → actual width animation.
    if (!hasMeasuredRef.current && width === 0 && height === 0) {
      return;
    }

    hasMeasuredRef.current = true;
    const info = computeContainerInfo(width, height);
    setContainerInfo(info);
  }, [containerRef]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initial measurement — use requestAnimationFrame for synchronous feel
    // without an artificial delay that would cause visible animation.
    const rafId = requestAnimationFrame(() => {
      measureContainer();
    });

    // ResizeObserver for web. Native gets a single rAF measurement; the
    // consumer is expected to remount on dimension change (RN re-renders
    // on useWindowDimensions anyway).
    let resizeObserver: ResizeObserver | null = null;

    if (isWeb && hasWindow()) {
      resizeObserver = new ResizeObserver(() => {
        // Throttle resize events — skip if a measurement is already scheduled.
        if (timerRef.current) return;
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          measureContainer();
        }, debounceMs);
      });

      try {
        resizeObserver.observe(containerRef.current);
      } catch {
        // Fallback to window resize — observer may be unavailable in tests.
        window.addEventListener('resize', measureContainer);
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (isWeb && hasWindow()) {
        window.removeEventListener('resize', measureContainer);
      }
    };
  }, [measureContainer, debounceMs, containerRef]);

  return containerInfo;
}

/**
 * Alternative hook that returns a callback to measure on demand.
 * Useful for components that need manual control over when to measure.
 */
export function useContainerMeasure() {
  const measureContainer = useCallback((element: any): ContainerMeasurement => {
    const { width, height } = measureElement(element);
    return computeContainerInfo(width, height);
  }, []);

  return measureContainer;
}

export default useContainerQuery;
