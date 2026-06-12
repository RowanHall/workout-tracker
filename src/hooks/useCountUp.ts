import { useEffect, useState } from 'react';

/** Animates a number from 0 to target with an ease-out curve, like game
 *  score counters. */
export function useCountUp(target: number, duration = 800, delay = 0): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const timeout = setTimeout(() => {
      const step = (t: number) => {
        if (start === null) start = t;
        const p = Math.min(1, (t - start) / duration);
        setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);

  return value;
}
