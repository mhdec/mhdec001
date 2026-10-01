import { useEffect, useRef, useState } from 'react';

export function usePullToRefresh(onRefresh: () => void) {
  const [pullDistance, setPullDistance] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartYRef = useRef<number>(0);
  const pullDistRef = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        touchStartYRef.current = e.touches[0].clientY;
      } else {
        touchStartYRef.current = 0;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartYRef.current > 0 && window.scrollY <= 0) {
        const currentY = e.touches[0].clientY;
        const dist = currentY - touchStartYRef.current;
        if (dist > 0) {
          // Prevent native browser page reload / navigation!
          if (e.cancelable) {
            e.preventDefault();
          }
          pullDistRef.current = Math.min(dist, 100);
          setPullDistance(pullDistRef.current);
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistRef.current > 60) {
        onRefresh();
      }
      pullDistRef.current = 0;
      setPullDistance(0);
      touchStartYRef.current = 0;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh]);

  return { containerRef, pullDistance };
}
