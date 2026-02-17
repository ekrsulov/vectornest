import React from 'react';
import { SnapPointsCache as SharedSnapPointsCache } from '../../ui/SnapPointsCache';
import type { ArrowsPluginSlice, ArrowsPluginActions } from './slice';

/**
 * Component that manages the snap points cache for the arrows tool.
 * Refreshes the cache when entering arrows mode.
 */
export const SnapPointsCache: React.FC = () => (
  <SharedSnapPointsCache
    pluginId="arrows"
    refreshSelector={(state) => (state as unknown as ArrowsPluginSlice & ArrowsPluginActions).refreshArrowsSnapPointsCache}
  />
);
