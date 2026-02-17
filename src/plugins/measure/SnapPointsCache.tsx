import React from 'react';
import { SnapPointsCache as SharedSnapPointsCache } from '../../ui/SnapPointsCache';
import type { MeasurePluginSlice, MeasurePluginActions } from './slice';

/**
 * Component that manages the snap points cache for the measure tool.
 * Refreshes the cache when entering measure mode.
 */
export const SnapPointsCache: React.FC = () => (
  <SharedSnapPointsCache
    pluginId="measure"
    refreshSelector={(state) => (state as unknown as MeasurePluginSlice & MeasurePluginActions).refreshSnapPointsCache}
  />
);
