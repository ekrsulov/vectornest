import React, { useMemo, useRef } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { Point } from '../types';
import type { PluginHooksContext } from '../types/plugins';
import { pluginManager } from '../utils/pluginManager';
import { logger } from '../utils/logger';

interface PluginHooksProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  screenToCanvas: (x: number, y: number) => Point;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emitPointerEvent: (type: 'pointerdown' | 'pointermove' | 'pointerup', event: any, point: Point) => void;
}

/** Always-called hook that validates hook count stability in dev mode. */
function useDevHookCountGuard(label: string, count: number): void {
  const hookCountRef = useRef(count);
  if (import.meta.env.DEV && hookCountRef.current !== count) {
    logger.warn(
      `[PluginHooks] ${label} hook count changed from ${hookCountRef.current} to ${count}. This violates Rules of Hooks.`
    );
  }
}

/**
 * Dynamic hook renderer for plugins
 * Creates a component wrapper for each plugin's hooks to avoid React hooks rules violations
 */
const PluginHooksWrapper = ({ pluginId, hooksContext }: { pluginId: string; hooksContext: PluginHooksContext }) => {
  const pluginHooks = pluginManager.getPluginHooks(pluginId);

  // Safe because key={activePlugin} forces remount when active plugin changes,
  // guaranteeing a stable hook count per component instance.
  useDevHookCountGuard(`Plugin "${pluginId}"`, pluginHooks.length);

  pluginHooks.forEach(contribution => {
    contribution.hook(hooksContext);
  });

  return null;
};

/**
 * Global hooks renderer for plugins that need to run regardless of active tool
 * Executes hooks marked with `global: true` in their plugin definition
 */
const GlobalPluginHooksWrapper = ({ hooksContext }: { hooksContext: PluginHooksContext }) => {
  const globalPluginHooks = pluginManager.getGlobalPluginHooks();

  useDevHookCountGuard('Global plugin hooks', globalPluginHooks.length);

  globalPluginHooks.forEach(contribution => {
    contribution.hook(hooksContext);
  });

  return null;
};

export const PluginHooksRenderer = ({ svgRef, screenToCanvas, emitPointerEvent }: PluginHooksProps) => {
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const viewportZoom = useCanvasStore(state => state.viewport.zoom);
  const scaleStrokeWithZoom = useCanvasStore(state => state.settings.scaleStrokeWithZoom);

  // Create context object to pass to hooks
  const hooksContext = useMemo<PluginHooksContext>(() => ({
    svgRef,
    screenToCanvas,
    emitPointerEvent,
    activePlugin,
    viewportZoom,
    scaleStrokeWithZoom,
  }), [svgRef, screenToCanvas, emitPointerEvent, activePlugin, viewportZoom, scaleStrokeWithZoom]);

  return (
    <>
      <GlobalPluginHooksWrapper hooksContext={hooksContext} />
      {activePlugin && (
        <PluginHooksWrapper
          key={activePlugin}
          pluginId={activePlugin}
          hooksContext={hooksContext}
        />
      )}
    </>
  );
};
