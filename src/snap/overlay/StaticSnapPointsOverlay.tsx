import React, { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { useCanvasStore, canvasStoreApi } from '../../store/canvasStore';
import { useCanvasEventBus } from '../../canvas/CanvasEventBusContext';
import { SnapPointCrossOverlay } from '../../overlays/SnapPointOverlay';
import type { SnapPoint as LegacySnapPoint } from '../../utils/snapPointUtils';
import { SNAP_POINTS_VISIBILITY_RADIUS } from '../../constants';
import type { Point } from '../../types';
import { getDragPointInfo } from '../../utils/dragUtils';
import { useActiveDragContext, usePluginSnapConfig, type SnapStoreExtensions } from './useSnapOverlayContext';
import { getCursorPosition, setCursorPosition, subscribeCursorPosition } from '../cursorPositionStore';

/**
 * Unified overlay for displaying static snap points when "Show Snap Points" is enabled.
 * Works for any plugin that provides snap configuration through behaviorFlags.
 *
 * Snap points are filtered by proximity to the cursor position for better UX.
 * Only points within SNAP_POINTS_VISIBILITY_RADIUS (in screen pixels) are shown.
 */
export const StaticSnapPointsOverlay: React.FC = () => {
  const viewport = useCanvasStore((state) => state.viewport);
  const elements = useCanvasStore((state) => state.elements);
  const cursorPosition = useSyncExternalStore(subscribeCursorPosition, getCursorPosition, () => null);
  const snapConfig = usePluginSnapConfig();
  const dragContext = useActiveDragContext();
  const configDragContext = snapConfig?.dragContext ?? null;
  const configDragPoint = getDragPointInfo(configDragContext);
  const dragContextPoint = getDragPointInfo(dragContext);
  const activeDragPoint = dragContextPoint ?? configDragPoint ?? null;

  const isEditPointDrag =
    snapConfig?.isPointEditMode &&
    (snapConfig?.isInteracting || dragContext?.isDragging || activeDragPoint?.isDragging);

  const allowStaticOverlay =
    snapConfig?.mode === 'arrowSnap' ||
    snapConfig?.mode === 'measureSnap' ||
    isEditPointDrag;

  const shouldShow = allowStaticOverlay && (snapConfig?.showStaticPoints ?? false);
  const eventBus = useCanvasEventBus();

  useEffect(() => {
    if (!shouldShow) {
      setCursorPosition(null);
      return;
    }

    const handlePointerMove = ({ point }: { point: Point }) => {
      setCursorPosition(point);
    };

    const unsubscribe = eventBus.subscribe('pointermove', handlePointerMove);

    return () => {
      unsubscribe();
      setCursorPosition(null);
    };
  }, [shouldShow, eventBus]);

  // Debounce snap recalculation to avoid re-running at 60fps when elements change during drawing
  const snapRecalcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!shouldShow || snapConfig?.mode !== 'objectSnap') return;

    const recalc = () => {
      const state = canvasStoreApi.getState() as SnapStoreExtensions;
      if (state.findAvailableSnapPoints) {
        const forceRefresh =
          snapConfig?.isPointEditMode && (dragContext?.isDragging || activeDragPoint?.isDragging);
        const excludeIds =
          snapConfig?.isPointEditMode && (dragContext?.isDragging || activeDragPoint?.isDragging)
            ? []
            : state.selectedIds || [];
        state.findAvailableSnapPoints(excludeIds, { force: forceRefresh });
      }
    };

    // During drag, recalculate immediately; otherwise debounce for element changes
    const isDragging = dragContext?.isDragging || activeDragPoint?.isDragging;
    if (isDragging) {
      recalc();
    } else {
      if (snapRecalcTimerRef.current) clearTimeout(snapRecalcTimerRef.current);
      snapRecalcTimerRef.current = setTimeout(recalc, 100);
    }

    return () => {
      if (snapRecalcTimerRef.current) {
        clearTimeout(snapRecalcTimerRef.current);
        snapRecalcTimerRef.current = null;
      }
    };
  }, [
    shouldShow,
    snapConfig?.mode,
    snapConfig?.isPointEditMode,
    dragContext?.isDragging,
    activeDragPoint?.elementId,
    activeDragPoint?.isDragging,
    elements,
  ]);

  const filterPointsByProximity = useCallback(
    (points: LegacySnapPoint[]): LegacySnapPoint[] => {
      if (snapConfig?.isPointEditMode && (dragContext?.isDragging ?? activeDragPoint?.isDragging)) {
        return points;
      }

      if (!cursorPosition) {
        return [];
      }

      const radiusInCanvas = SNAP_POINTS_VISIBILITY_RADIUS / viewport.zoom;

      return points.filter((snapPoint) => {
        const dx = snapPoint.point.x - cursorPosition.x;
        const dy = snapPoint.point.y - cursorPosition.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSquared = radiusInCanvas * radiusInCanvas;
        return distanceSquared <= radiusSquared;
      });
    },
    [cursorPosition, viewport.zoom, snapConfig?.isPointEditMode, dragContext?.isDragging, activeDragPoint?.isDragging]
  );

  if (!shouldShow || !snapConfig) {
    return null;
  }

  let displayPoints: LegacySnapPoint[] = [];
  const opacity = (snapConfig.snapPointsOpacity ?? 50) / 100;

  if (snapConfig.mode === 'objectSnap' && snapConfig.availableSnapPoints) {
    if (activeDragPoint?.isDragging) {
      const editElementId = activeDragPoint?.elementId;
      const editCommandIndex = activeDragPoint?.commandIndex;

      if (!editElementId || editCommandIndex === undefined) {
        displayPoints = snapConfig.availableSnapPoints;
      } else {
        const staticPoints = (snapConfig.availableSnapPoints as LegacySnapPoint[]).filter(
          (sp: LegacySnapPoint) => sp.elementId !== editElementId
        );

        const state = canvasStoreApi.getState() as SnapStoreExtensions;
        let editingElementPoints: LegacySnapPoint[] = [];
        if (state.findSnapPointsForElements && editElementId) {
          editingElementPoints = state.findSnapPointsForElements([editElementId], viewport) || [];
        }

        const editElement = elements.find((el: { id: string }) => el.id === editElementId);
        const pathData = (editElement as { data?: { subPaths?: Array<Array<{ type: string }>> } } | undefined)?.data;
        const commands = pathData?.subPaths?.flat() || [];
        const zCommandIndex = commands.findIndex((cmd: { type: string }) => cmd.type === 'Z');
        const isClosedPath = zCommandIndex !== -1;

        const excludeMidpointCommands = new Set<number>();

        if (editCommandIndex === 0) {
          excludeMidpointCommands.add(1);
          if (isClosedPath) {
            excludeMidpointCommands.add(zCommandIndex);
          }
        } else {
          excludeMidpointCommands.add(editCommandIndex);
          excludeMidpointCommands.add(editCommandIndex + 1);
        }

        const filteredEditingPoints = editingElementPoints.filter((snapPoint: LegacySnapPoint) => {
          if (snapPoint.type === 'bbox-corner') return false;

          const cmdIndex = snapPoint.metadata?.commandIndex;
          const isSameElement = snapPoint.elementId === editElementId;

          if (
            snapPoint.type === 'anchor' &&
            isSameElement &&
            (cmdIndex === editCommandIndex || snapPoint.metadata?.pointIndex === 0 || cmdIndex === undefined)
          ) {
            return false;
          }

          if (cmdIndex !== undefined && cmdIndex === editCommandIndex) {
            return false;
          }

          if (
            snapPoint.type === 'midpoint' &&
            cmdIndex !== undefined &&
            excludeMidpointCommands.has(cmdIndex)
          ) {
            return false;
          }

          return true;
        });

        displayPoints = [...staticPoints, ...filteredEditingPoints];
      }
    } else {
      displayPoints = snapConfig.availableSnapPoints;
    }
  } else if (snapConfig.mode === 'measureSnap' || snapConfig.mode === 'arrowSnap') {
    displayPoints = snapConfig.cachedSnapPoints;
  }

  const visiblePoints = filterPointsByProximity(displayPoints);

  if (visiblePoints.length === 0) {
    return null;
  }

  return (
    <SnapPointCrossOverlay
      snapPoints={visiblePoints}
      viewport={viewport}
      opacity={opacity}
      showAllPoints={true}
    />
  );
};
