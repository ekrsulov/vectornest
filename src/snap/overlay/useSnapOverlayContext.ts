import React, { useCallback, useSyncExternalStore } from 'react';
import { canvasStoreApi, type CanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';
import type { SnapOverlayConfig } from '../../types/plugins';
import { getActiveSnapProviders } from '../snapProviderRegistry';
import { getActiveDragContext } from '../../canvas/interactions/dragHandlerRegistry';
import type { DragContext } from '../../types/extensionPoints';
import { getDragPointInfo } from '../../utils/dragUtils';
import type { SnapPoint as LegacySnapPoint } from '../../utils/snapPointUtils';

export type SnapStoreExtensions = {
  findAvailableSnapPoints?: (selectedIds: string[], options?: { force?: boolean }) => void;
  findSnapPointsForElements?: (elementIds: string[], viewport: { zoom: number }) => LegacySnapPoint[];
  selectedIds?: string[];
};

export function usePluginSnapConfig(): SnapOverlayConfig | null {
  const lastConfigRef = React.useRef<SnapOverlayConfig | null>(null);
  const lastKeyRef = React.useRef<string | null>(null);

  const subscribe = useCallback((cb: () => void) => canvasStoreApi.subscribe(cb), []);

  const makeKey = useCallback((cfg: SnapOverlayConfig | null): string => {
    if (!cfg) return 'null';
    const dragKey = cfg.dragContext
      ? `${cfg.dragContext.pluginId ?? ''}:${cfg.dragContext.type ?? ''}:${cfg.dragContext.isDragging ? '1' : '0'}`
      : 'no-drag';
    const currentKey = cfg.currentSnapInfo
      ? `${cfg.currentSnapInfo.type}:${cfg.currentSnapInfo.elementId ?? ''}`
      : 'no-current';
    const availLen = cfg.availableSnapPoints?.length ?? 0;
    const cachedLen = cfg.cachedSnapPoints?.length ?? 0;
    return [
      cfg.mode,
      cfg.showStaticPoints ? '1' : '0',
      cfg.snapPointsOpacity ?? 0,
      cfg.isInteracting ? '1' : '0',
      cfg.isPointEditMode ? '1' : '0',
      cfg.usesDirectDragging ? '1' : '0',
      cfg.handlesFeedbackInternally ? '1' : '0',
      availLen,
      cachedLen,
      dragKey,
      currentKey,
    ].join('|');
  }, []);

  const getSnapshot = useCallback(() => {
    const state = canvasStoreApi.getState() as CanvasStore;
    const providers = getActiveSnapProviders(state);
    const preferredProviders = state.activePlugin
      ? [
          ...providers.filter((p) => p.pluginId === state.activePlugin),
          ...providers.filter((p) => p.pluginId !== state.activePlugin),
        ]
      : providers;
    let candidate: SnapOverlayConfig | null = null;

    for (const provider of preferredProviders) {
      const cfg = provider.getOverlayConfig?.(state);
      if (cfg) {
        candidate = cfg;
        break;
      }
    }

    if (!candidate) {
      candidate = pluginManager.getActivePluginSnapOverlayConfig() ?? null;
    }

    const key = makeKey(candidate);
    const prev = lastConfigRef.current;
    const prevKey = lastKeyRef.current;

    // Use a compact key to avoid returning a fresh object on every render
    if (prev && prevKey === key) {
      return prev;
    }

    lastConfigRef.current = candidate;
    lastKeyRef.current = key;
    return candidate;
  }, [makeKey]);

  return useSyncExternalStore(subscribe, getSnapshot, () => lastConfigRef.current);
}

export function useActiveDragContext(): DragContext | null {
  const lastContextRef = React.useRef<DragContext | null>(null);

  const subscribe = useCallback((cb: () => void) => canvasStoreApi.subscribe(cb), []);

  const getSnapshot = useCallback(() => {
    const state = canvasStoreApi.getState() as CanvasStore;
    const context = getActiveDragContext(state);
    const prev = lastContextRef.current;

    const prevDragPoint = getDragPointInfo(prev);
    const nextDragPoint = getDragPointInfo(context);

    const isSame =
      prev === context ||
      (!!prev &&
        !!context &&
        prev.pluginId === context.pluginId &&
        prev.type === context.type &&
        prev.isDragging === context.isDragging &&
        prev.elementIds?.length === context.elementIds?.length &&
        prevDragPoint?.elementId === nextDragPoint?.elementId &&
        prevDragPoint?.commandIndex === nextDragPoint?.commandIndex &&
        prevDragPoint?.pointIndex === nextDragPoint?.pointIndex);

    if (!isSame) {
      lastContextRef.current = context;
      return context;
    }

    return prev;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => lastContextRef.current);
}
