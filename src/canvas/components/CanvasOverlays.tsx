/**
 * Canvas Overlays Component
 *
 * Renders overlay components contributed by plugins in the canvas area.
 * These overlays are rendered outside the main SVG and receive viewport and canvas size context.
 */

import React, { useMemo, useSyncExternalStore } from 'react';
import { pluginManager } from '../../utils/pluginManager';
import { canvasStoreApi } from '../../store/canvasStore';
import { logger } from '../../utils/logger';
import { usePluginRegistrationVersion } from '../../hooks/usePluginRegistrationVersion';

interface CanvasOverlaysProps {
  viewport: { zoom: number; panX: number; panY: number };
  canvasSize: { width: number; height: number };
}

const EMPTY_IDS: string[] = [];
const EMPTY_SUBPATHS: Array<{ elementId: string; subpathIndex: number }> = [];
const EMPTY_COMMANDS: Array<{ elementId: string; subpathIndex: number; commandIndex: number }> = [];

export const CanvasOverlays: React.FC<CanvasOverlaysProps> = React.memo(({ viewport, canvasSize }) => {
  const registrationVersion = usePluginRegistrationVersion();
  const overlays = pluginManager.getCanvasOverlays();
  const storeSnapshot = useSyncExternalStore(
    canvasStoreApi.subscribe,
    canvasStoreApi.getState,
    canvasStoreApi.getState
  );
  void registrationVersion;
  const activePlugin = storeSnapshot.activePlugin;
  const selectedIds = storeSnapshot.selectedIds ?? EMPTY_IDS;
  const selectedSubpaths = storeSnapshot.selectedSubpaths ?? EMPTY_SUBPATHS;
  const selectedCommands = storeSnapshot.selectedCommands ?? EMPTY_COMMANDS;
  const totalElementsCount = storeSnapshot.elements?.length ?? 0;
  const withoutDistractionMode = Boolean(storeSnapshot.settings.withoutDistractionMode);

  // Build context for overlay conditions — memoized to avoid re-creating on each render
  const context = useMemo(() => ({
    viewport,
    canvasSize,
    activePlugin,
    selectedIds,
    selectedSubpaths,
    selectedCommands,
    selectedElementsCount: selectedIds.length,
    selectedSubpathsCount: selectedSubpaths.length,
    selectedCommandsCount: selectedCommands.length,
    totalElementsCount,
    withoutDistractionMode,
    state: storeSnapshot as Record<string, unknown>,
  }), [
    viewport,
    canvasSize,
    activePlugin,
    selectedIds,
    selectedSubpaths,
    selectedCommands,
    totalElementsCount,
    withoutDistractionMode,
    storeSnapshot,
  ]);

  return (
    <>
      {overlays.map((overlay) => {
        const OverlayComponent = overlay.component;
        // Check condition if provided
        if (overlay.condition) {
          try {
            if (!overlay.condition(context)) return null;
          } catch (error) {
            if (import.meta.env.DEV) {
              logger.warn(`[CanvasOverlays] Condition check failed for overlay ${overlay.id}`, error);
            }
            return null;
          }
        }
        return (
          <OverlayComponent
            key={overlay.id}
            viewport={viewport}
            canvasSize={canvasSize}
          />
        );
      })}
    </>
  );
});
CanvasOverlays.displayName = 'CanvasOverlays';
