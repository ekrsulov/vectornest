import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { TransformationHandlers } from './TransformationHandlers';
import { AdvancedTransformationOverlay } from './AdvancedTransformationOverlay';
import { CenterMarker } from './CenterMarker';
import { RotationPivotHandle } from './RotationPivotHandle';
import { CornerCoordinateLabels } from './CornerCoordinateLabels';
import { MeasurementRulers } from './MeasurementRulers';
import { computeAdjustedBounds } from '../../utils/overlayHelpers';
import { useCanvasStore } from '../../store/canvasStore';
import type { TransformationPluginSlice } from './slice';
import type { GroupElement } from '../../types';

interface GroupTransformationOverlayProps {
  group: GroupElement;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  activePlugin: string | null;
  transformation?: {
    showCoordinates?: boolean;
    showRulers?: boolean;
    advancedMode?: boolean;
    rotationPivot?: { x: number; y: number } | null;
    rotationPivotTarget?: string | null;
  };
  onTransformationHandlerPointerDown: (e: React.PointerEvent, groupId: string, handler: string) => void;
  onTransformationHandlerPointerUp: (e: React.PointerEvent) => void;
}

/**
 * Transformation overlay for groups - shows transformation handlers for the entire group
 */
export const GroupTransformationOverlay: React.FC<GroupTransformationOverlayProps> = ({
  group,
  bounds,
  viewport,
  activePlugin,
  transformation: transformationProp,
  onTransformationHandlerPointerDown: _onTransformationHandlerPointerDown,
  onTransformationHandlerPointerUp: _onTransformationHandlerPointerUp,
}) => {
  // Get transformation state from store (fallback if not in props)
  const transformationFromStore = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).transformation
  );
  const transformation = transformationProp ?? transformationFromStore;

  // Get transformation handlers from store
  const transformationHandlers = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).transformationHandlers
  );
  const updateTransformationState = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).updateTransformationState
  );
  const transformState = useCanvasStore(state =>
    (state as unknown as TransformationPluginSlice).transformState
  );

  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);

  // Create screenToCanvas function using viewport prop
  const screenToCanvas = React.useCallback((screenX: number, screenY: number) => {
    // Get SVG element from DOM to account for its position (e.g., when sidebar is pinned)
    const svgElement = document.querySelector('svg[data-canvas="true"]') as SVGSVGElement | null;
    const rect = svgElement?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return {
      x: (screenX - rect.left - viewport.panX) / viewport.zoom,
      y: (screenY - rect.top - viewport.panY) / viewport.zoom,
    };
  }, [viewport.panX, viewport.panY, viewport.zoom]);

  // Create wrapper functions for normal transformation
  const onNormalTransformationHandlerPointerDown = React.useCallback((e: React.PointerEvent, targetId: string, handlerType: string) => {
    if (!transformationHandlers?.startTransformation) return;
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    transformationHandlers.startTransformation(targetId, handlerType, point);
  }, [transformationHandlers, screenToCanvas]);

  const onNormalTransformationHandlerPointerUp = React.useCallback((_e: React.PointerEvent) => {
    if (!transformationHandlers?.endTransformation) return;
    transformationHandlers.endTransformation();
  }, [transformationHandlers]);

  // Create wrapper functions for advanced transformation
  const onAdvancedTransformationHandlerPointerDown = React.useCallback((e: React.PointerEvent, _targetId: string, handlerType: string) => {
    if (!transformationHandlers?.startAdvancedTransformation) return;
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    const isModifierPressed = e.shiftKey || isVirtualShiftActive;
    transformationHandlers.startAdvancedTransformation(handlerType, point, isModifierPressed);
  }, [transformationHandlers, screenToCanvas, isVirtualShiftActive]);

  const onAdvancedTransformationHandlerPointerUp = React.useCallback((_e: React.PointerEvent) => {
    if (!transformationHandlers?.endAdvancedTransformation) return;
    transformationHandlers.endAdvancedTransformation();
  }, [transformationHandlers]);

  // Colors that adapt to dark mode
  const coordinateBackgroundColor = useColorModeValue('#6b7280', '#4b5563');
  const coordinateTextColor = useColorModeValue('white', '#f9fafb');
  const rulerColor = useColorModeValue('#666', '#d1d5db');
  const rulerTextColor = useColorModeValue('#666', '#d1d5db');

  // Show handlers only in transformation mode (user activates this mode explicitly)
  const shouldShowHandlers = activePlugin === 'transformation';

  // Use cyan color for group selection (consistent with group selection bounds)
  const selectionColor = '#22d3ee'; // cyan

  // Compute adjusted bounds with offset (same as group selection bounds feedback visual)
  const adjustedBounds = computeAdjustedBounds(bounds, viewport.zoom, 8);
  const handlerSize = 10 / viewport.zoom;

  const centerX = (adjustedBounds.minX + adjustedBounds.maxX) / 2;
  const centerY = (adjustedBounds.minY + adjustedBounds.maxY) / 2;
  const pivotTarget = `group:${group.id}`;
  const pivotPoint = transformation?.rotationPivotTarget === pivotTarget && transformation?.rotationPivot
    ? transformation.rotationPivot
    : { x: centerX, y: centerY };
  const isPivotDisabled = transformState?.isTransforming ?? false;
  const handlePivotChange = React.useCallback((point: { x: number; y: number }) => {
    updateTransformationState?.({
      rotationPivot: point,
      rotationPivotTarget: pivotTarget,
    });
  }, [updateTransformationState, pivotTarget]);

  if (!shouldShowHandlers) return null;

  return (
    <g key={`group-transformation-${group.id}`}>
      {/* Transformation handlers for group */}
      {transformation?.advancedMode ? (
        <AdvancedTransformationOverlay
          bounds={adjustedBounds}
          elementId={`group:${group.id}`}
          viewport={viewport}
          onPointerDown={onAdvancedTransformationHandlerPointerDown}
          onPointerUp={onAdvancedTransformationHandlerPointerUp}
          selectionColor={selectionColor}
        />
      ) : (
        <TransformationHandlers
          bounds={adjustedBounds}
          elementId={`group:${group.id}`}
          handlerSize={handlerSize}
          selectionColor={selectionColor}
          viewport={viewport}
          onPointerDown={onNormalTransformationHandlerPointerDown}
          onPointerUp={onNormalTransformationHandlerPointerUp}
        />
      )}

      {/* Center marker */}
      {transformation?.advancedMode ? (
        <CenterMarker
          centerX={centerX}
          centerY={centerY}
          color={selectionColor}
          zoom={viewport.zoom}
          showCoordinates={transformation?.showCoordinates}
        />
      ) : (
        <RotationPivotHandle
          pivot={pivotPoint}
          color={selectionColor}
          zoom={viewport.zoom}
          showCoordinates={transformation?.showCoordinates}
          screenToCanvas={screenToCanvas}
          onChange={handlePivotChange}
          disabled={isPivotDisabled}
        />
      )}

      {/* Corner coordinates */}
      {transformation?.showCoordinates && (
        <CornerCoordinateLabels
          bounds={bounds}
          zoom={viewport.zoom}
          backgroundColor={coordinateBackgroundColor}
          textColor={coordinateTextColor}
        />
      )}

      {/* Measurement rulers */}
      {transformation?.showRulers && (
        <MeasurementRulers
          bounds={bounds}
          zoom={viewport.zoom}
          rulerColor={rulerColor}
          textColor={rulerTextColor}
        />
      )}
    </g>
  );
};
