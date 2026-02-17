import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useSnapPointsCache } from '../hooks/useSnapPointsCache';
import type { SnapPoint } from '../utils/snapPointUtils';

interface SnapPointsCacheProps {
  pluginId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refreshSelector: (state: any) => (snapPoints: SnapPoint[]) => void;
}

/**
 * Generic component that manages the snap points cache for a plugin.
 * Refreshes the cache when entering the specified plugin mode.
 */
export const SnapPointsCache: React.FC<SnapPointsCacheProps> = ({ pluginId, refreshSelector }) => {
  const refresh = useCanvasStore(refreshSelector);

  useSnapPointsCache({
    pluginId,
    onRefresh: refresh
  });

  return null;
};