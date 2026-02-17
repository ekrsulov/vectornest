import { useMemo } from 'react';

/**
 * Simplified toolbar position calculation.
 * Returns CSS properties for centering toolbars with sidebar offset.
 */
export function useToolbarPositionStyles({
  leftOffset = 0,
  rightOffset = 0,
}: {
  leftOffset?: number;
  rightOffset?: number;
}) {
  return useMemo(() => {
    const hasPinnedOffset = leftOffset > 0 || rightOffset > 0;

    return {
      left: hasPinnedOffset ? `${leftOffset}px` : '50%',
      right: hasPinnedOffset ? `${rightOffset}px` : 'auto',
      transform: hasPinnedOffset ? 'none' : 'translateX(-50%)',
      hasPinnedOffset,
    };
  }, [leftOffset, rightOffset]);
}
