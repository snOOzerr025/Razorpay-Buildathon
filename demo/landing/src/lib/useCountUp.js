import { useEffect, useState } from 'react';
import { animate, useInView } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

export function useCountUp(ref, endValue, duration = 0.9, delay = 0) {
  const [value, setValue] = useState(0);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isInView) {
      if (shouldReduceMotion) {
        setValue(endValue);
      } else {
        const controls = animate(0, endValue, {
          duration,
          delay,
          ease: 'easeOut',
          onUpdate(val) {
            setValue(Math.round(val));
          },
        });
        return () => controls.stop();
      }
    }
  }, [isInView, endValue, duration, delay, shouldReduceMotion]);

  return value;
}
