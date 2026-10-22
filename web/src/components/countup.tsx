import { animate, MotionGlobalConfig, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/**
 * A figure that counts up to its value, and from one value to the next, the way a wallet
 * app shows a balance. It lands on the exact value; with reduced motion it simply is it.
 */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion() || MotionGlobalConfig.skipAnimations;
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      from.current = value;
      return undefined;
    }
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setShown,
      onComplete: () => setShown(value),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, reduce]);

  return <>{format(shown)}</>;
}
