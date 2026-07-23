// hooks/usePrevious.ts
// Returns the previous value of a variable. Useful for detecting value
// changes in useEffect (e.g. re-running an effect only when a prop
// changes, not on first render).
//
// Returns undefined on the first render.

import { useRef, useEffect } from 'react';

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export default usePrevious;
