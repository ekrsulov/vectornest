import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { useSelectionBounds } from '../../hooks/useSelectionBounds';
import { TransformationHandlers } from './TransformationHandlers';
import { AdvancedTransformationOverlay } from './AdvancedTransformationOverlay';
import { CenterMarker } from './CenterMarker';
import { RotationPivotHandle } from './RotationPivotHandle';
import { CornerCoordinateLabels } from './CornerCoordinateLabels';
import { MeasurementRulers } from './MeasurementRulers';
import { SelectionRects } from '../../overlays/SelectionRects';
import { useCanvasStore } from '../../store/canvasStore';
import { getParentCumulativeTransformMatrix } from '../../utils/elementTransformUtils';
import type { TransformationPluginSlice } from './slice';
import type { CanvasElement } from '../../types';

interface TransformationOverlayProps {
  element: {
    id: string;
    type: string;
    data: unknown;
    zIndex: number;
    parentId: string | null;
  };
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  selectedSubpaths: Array<{
    elementId: string;
    subpathIndex: number;
  }>;
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
  isWorkingWithSubpaths: boolean;
}

export const TransformationOverlay: React.FC<TransformationOverlayProps> = ({
  element,
  bounds,
  selectedSubpaths,
  viewport,
  activePlugin,
  transformation: transformationProp,
  isWorkingWithSubpaths,
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
  const elements = useCanvasStore(state => state.elements);
  
  // Get the accumulated transform matrix from parent groups
  const parentTransformMatrix = React.useMemo(
    () => getParentCumulativeTransformMatrix(element as CanvasElement, elements),
    [element, elements]
  );
  
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

  // Create wrapper functions that adapt the handler signatures
  const onTransformationHandlerPointerDown = React.useCallback((e: React.PointerEvent, targetId: string, handlerType: string) => {
    if (!transformationHandlers?.startTransformation) return;
    e.stopPropagation();
    const point = screenToCanvas(e.clientX, e.clientY);
    transformationHandlers.startTransformation(targetId, handlerType, point);
  }, [transformationHandlers, screenToCanvas]);

  const onTransformationHandlerPointerUp = React.useCallback((_e: React.PointerEvent) => {
    if (!transformationHandlers?.endTransformation) return;
    transformationHandlers.endTransformation();
  }, [transformationHandlers]);

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
  // For subpaths: only show in transformation mode AND exactly one subpath is selected
  const shouldShowHandlers = !isWorkingWithSubpaths
    ? activePlugin === 'transformation'
    : activePlugin === 'transformation' && selectedSubpaths.length === 1;

  // Use shared hook to compute selection bounds
  const {
    selectionColor,
    strokeWidth,
    adjustedElementBounds,
    subpathBoundsResults,
    subpathSelectionColor,
  } = useSelectionBounds({
    element,
    bounds,
    viewport,
    selectedSubpaths,
    skipSubpathMeasurements: !isWorkingWithSubpaths,
    transformMatrix: parentTransformMatrix,
  });

  const renderBounds = adjustedElementBounds ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const adjustedWidth = renderBounds.maxX - renderBounds.minX;
  const adjustedHeight = renderBounds.maxY - renderBounds.minY;
  const handlerSize = 10 / viewport.zoom;
  const centerX = renderBounds.minX + adjustedWidth / 2;
  const centerY = renderBounds.minY + adjustedHeight / 2;
  const pivotTarget = `element:${element.id}`;
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

  if (!adjustedElementBounds || !shouldShowHandlers) return null;

  // Build selection rectangles for subpaths when not transforming exactly one
  const shouldShowSubpathSelectionRect = isWorkingWithSubpaths && 
    !(activePlugin === 'transformation' && selectedSubpaths.length === 1);
  
  const selectionRects = shouldShowSubpathSelectionRect && adjustedWidth > 0 && adjustedHeight > 0
    ? [{
        x: adjustedElementBounds.minX,
        y: adjustedElementBounds.minY,
        width: adjustedWidth,
        height: adjustedHeight,
        key: `element-${element.id}`,
      }]
    : [];

  return (
    <g key={`transformation-${element.id}`}>
      {/* Selection rectangle - only show when working with subpaths but NOT in transformation mode with exactly one subpath selected */}
      <SelectionRects
        rects={selectionRects}
        color={selectionColor}
        strokeWidth={strokeWidth}
      />

      {/* Transformation handlers */}
      {!isWorkingWithSubpaths ? (
        // For complete paths
        transformation?.advancedMode ? (
          <AdvancedTransformationOverlay
            bounds={renderBounds}
            elementId={element.id}
            viewport={viewport}
            onPointerDown={onAdvancedTransformationHandlerPointerDown}
            onPointerUp={onAdvancedTransformationHandlerPointerUp}
            selectionColor={selectionColor}
          />
        ) : (
          <TransformationHandlers
            bounds={renderBounds}
            elementId={element.id}
            handlerSize={handlerSize}
            selectionColor={selectionColor}
            viewport={viewport}
            onPointerDown={onTransformationHandlerPointerDown}
            onPointerUp={onTransformationHandlerPointerUp}
          />
        )
      ) : (
        // For subpaths - show individual handlers for each selected subpath
        subpathBoundsResults.map((result) => (
          <g key={`subpath-handlers-${element.id}-${result.subpathIndex}`}>
            {transformation?.advancedMode ? (
              <AdvancedTransformationOverlay
                bounds={result.bounds}
                elementId={element.id}
                subpathIndex={result.subpathIndex}
                viewport={viewport}
                onPointerDown={onAdvancedTransformationHandlerPointerDown}
                onPointerUp={onAdvancedTransformationHandlerPointerUp}
                selectionColor={subpathSelectionColor}
              />
            ) : (
              <TransformationHandlers
                bounds={result.bounds}
                elementId={element.id}
                subpathIndex={result.subpathIndex}
                handlerSize={handlerSize}
                selectionColor={subpathSelectionColor}
                viewport={viewport}
                onPointerDown={onTransformationHandlerPointerDown}
                onPointerUp={onTransformationHandlerPointerUp}
              />
            )}

            {/* Center marker for subpath */}
            <CenterMarker
              centerX={result.centerX}
              centerY={result.centerY}
              color={subpathSelectionColor}
              zoom={viewport.zoom}
              showCoordinates={transformation?.showCoordinates}
            />

            {/* Corner coordinates for subpath */}
            {transformation?.showCoordinates && (
              <CornerCoordinateLabels
                bounds={result.rawBounds}
                zoom={viewport.zoom}
                backgroundColor={coordinateBackgroundColor}
                textColor={coordinateTextColor}
              />
            )}

            {/* Measurement rulers for subpath */}
            {transformation?.showRulers && (
              <MeasurementRulers
                bounds={result.rawBounds}
                zoom={viewport.zoom}
                rulerColor={rulerColor}
                textColor={rulerTextColor}
              />
            )}
          </g>
        ))
      )}

      {/* Center marker and coordinates for complete path */}
      {!isWorkingWithSubpaths && (
        <>
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
          {transformation?.showCoordinates && bounds && (
            <CornerCoordinateLabels
              bounds={bounds}
              zoom={viewport.zoom}
              backgroundColor={coordinateBackgroundColor}
              textColor={coordinateTextColor}
            />
          )}

          {/* Measurement rulers */}
          {transformation?.showRulers && bounds && (
            <MeasurementRulers
              bounds={bounds}
              zoom={viewport.zoom}
              rulerColor={rulerColor}
              textColor={rulerTextColor}
            />
          )}
        </>
      )}
    </g>
  );
};
