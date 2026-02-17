import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSnapStore } from '../store';
import { useCanvasStore } from '../../store/canvasStore';
import { SnapPointVisualization } from '../../overlays/SnapPointOverlay';
import { FeedbackOverlay } from '../../overlays/FeedbackOverlay';
import type { SnapPoint as LegacySnapPoint, SnapPointType } from '../../utils/snapPointUtils';
import { getSnapPointLabel } from '../../utils/snapPointUtils';
import { getDragPointInfo } from '../../utils/dragUtils';
import { useActiveDragContext, usePluginSnapConfig } from './useSnapOverlayContext';

/**
 * Overlay for active snap point during drag (edit mode) or measurement (measure mode).
 * Shows the crosshair visualization and feedback label.
 */
export const ActiveSnapOverlay: React.FC = () => {
  const snapResult = useSnapStore((state) => state.snapResult);
  const setIsShowingSnapCrosshair = useSnapStore((state) => state.setIsShowingSnapCrosshair);

  const { viewport } = useCanvasStore(
    useShallow((state) => ({
      viewport: state.viewport,
    }))
  );

  const snapConfig = usePluginSnapConfig();
  const dragContext = useActiveDragContext();
  const activeDragPointInfo = getDragPointInfo(snapConfig?.dragContext ?? dragContext);

  const [canvasSize, setCanvasSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  const usesObjectSnap = snapConfig?.mode === 'objectSnap';
  const usesMeasureSnap = snapConfig?.mode === 'measureSnap';
  const usesArrowSnap = snapConfig?.mode === 'arrowSnap';

  const handlesFeedbackInternally = snapConfig?.handlesFeedbackInternally ?? false;
  const usesDirectDragging = snapConfig?.usesDirectDragging ?? false;
  const isPointEditMode = snapConfig?.isPointEditMode ?? false;

  const isDraggingFromContext = dragContext?.isDragging ?? false;
  const isDirectlyDragging = usesDirectDragging && (activeDragPointInfo?.isDragging ?? false);

  const isDragging = snapConfig?.isInteracting || isDraggingFromContext || isDirectlyDragging;
  const isMeasuring = usesMeasureSnap && (snapConfig?.isInteracting || isDraggingFromContext);
  const isArrowDrawing = usesArrowSnap && (snapConfig?.isInteracting || isDraggingFromContext);

  const allowActiveOverlay =
    usesArrowSnap ||
    usesMeasureSnap ||
    (isPointEditMode && (snapConfig?.isInteracting || isDragging));

  const showObjectSnapOverlay =
    allowActiveOverlay &&
    (usesObjectSnap || isPointEditMode) &&
    isDragging &&
    (snapResult || (snapConfig?.showStaticPoints && (snapConfig?.availableSnapPoints?.length ?? 0) > 0));
  const showMeasureSnap = allowActiveOverlay && usesMeasureSnap && isMeasuring && snapConfig?.currentSnapInfo;
  const showArrowSnap = allowActiveOverlay && usesArrowSnap && isArrowDrawing && snapConfig?.currentSnapInfo;

  const willShowAnything = !!(showObjectSnapOverlay || showMeasureSnap || showArrowSnap);

  useEffect(() => {
    if (!willShowAnything) return;
    const onResize = () => setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [willShowAnything]);

  const willShowCrosshair = willShowAnything;

  useEffect(() => {
    setIsShowingSnapCrosshair(willShowCrosshair);
    return () => {
      setIsShowingSnapCrosshair(false);
    };
  }, [willShowCrosshair, setIsShowingSnapCrosshair]);

  if (!willShowAnything) {
    return null;
  }

  let activeSnapPoint: LegacySnapPoint | null = null;
  let snapMessage = 'Snap';
  let allSnapPoints: LegacySnapPoint[] = [];
  let showAllPoints = false;
  let allPointsOpacity = 0.5;

  if (showObjectSnapOverlay) {
    if (snapResult) {
      const { snappedPoint, snapPoints, allAvailableSnapPoints = [] } = snapResult;

      const originalSnapPoint = snapPoints[0]?.metadata?.original as LegacySnapPoint | undefined;
      const snapType = originalSnapPoint?.type || snapPoints[0]?.type || 'custom';

      activeSnapPoint = {
        point: snappedPoint,
        type: snapType as SnapPointType,
        elementId:
          originalSnapPoint?.elementId ||
          (snapPoints[0]?.metadata?.original as { elementId?: string } | undefined)?.elementId ||
          '',
      };

      allSnapPoints = allAvailableSnapPoints.map((sp) => {
        const originalMeta = sp.metadata?.original as { type?: string; elementId?: string } | undefined;
        return {
          point: { x: sp.point?.x ?? 0, y: sp.point?.y ?? 0 },
          type: (originalMeta?.type || sp.type) as SnapPointType,
          elementId: originalMeta?.elementId || sp.elementId || '',
        };
      });

      snapMessage = snapPoints[0] ? getSnapPointLabel(snapType as SnapPointType) : 'Snap';
    } else if (snapConfig?.currentSnapInfo) {
      activeSnapPoint = snapConfig.currentSnapInfo;
      snapMessage = getSnapPointLabel(snapConfig.currentSnapInfo.type);
    }

    if (allSnapPoints.length === 0 && snapConfig?.availableSnapPoints?.length) {
      allSnapPoints = snapConfig.availableSnapPoints;
    }

    showAllPoints = (snapConfig?.showStaticPoints ?? false) && allowActiveOverlay;
    allPointsOpacity = (snapConfig?.snapPointsOpacity ?? 50) / 100;
  } else if (showMeasureSnap && snapConfig?.currentSnapInfo) {
    activeSnapPoint = snapConfig.currentSnapInfo;
    snapMessage = getSnapPointLabel(snapConfig.currentSnapInfo.type);
    showAllPoints = false;
  } else if (showArrowSnap && snapConfig?.currentSnapInfo) {
    activeSnapPoint = snapConfig.currentSnapInfo;
    snapMessage = getSnapPointLabel(snapConfig.currentSnapInfo.type);
    showAllPoints = false;
  }

  const staticAllowed = usesArrowSnap || usesMeasureSnap || (isPointEditMode && isDragging);

  if (!staticAllowed) {
    showAllPoints = false;
  }

  if (!allowActiveOverlay) {
    return null;
  }

  if (!activeSnapPoint && (!showAllPoints || allSnapPoints.length === 0)) {
    return null;
  }

  const showFeedbackOverlay = !handlesFeedbackInternally;

  return (
    <>
      <g className="snap-overlay" style={{ pointerEvents: 'none' }}>
        <SnapPointVisualization
          allSnapPoints={allSnapPoints}
          activeSnapPoint={activeSnapPoint}
          viewport={viewport}
          showAllPoints={showAllPoints}
          allPointsOpacity={allPointsOpacity}
        />
      </g>
      {showFeedbackOverlay && (
        <FeedbackOverlay
          viewport={viewport}
          canvasSize={canvasSize}
          customFeedback={{ message: snapMessage, visible: true }}
        />
      )}
    </>
  );
};
