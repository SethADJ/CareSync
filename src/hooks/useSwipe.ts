import { useRef, useCallback } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

interface UseSwipeOptions {
  onSwipe: (direction: SwipeDirection) => void;
  threshold?: number; // minimum px to trigger swipe
  preventScrollOnHorizontal?: boolean;
}

export function useSwipe({ onSwipe, threshold = 50, preventScrollOnHorizontal = false }: UseSwipeOptions): SwipeHandlers {
  const startX = useRef(0);
  const startY = useRef(0);
  const tracking = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    tracking.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!tracking.current || !preventScrollOnHorizontal) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      e.preventDefault();
    }
  }, [preventScrollOnHorizontal]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!tracking.current) return;
    tracking.current = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) >= threshold) {
        onSwipe(dx > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(dy) >= threshold) {
        onSwipe(dy > 0 ? 'down' : 'up');
      }
    }
  }, [onSwipe, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
