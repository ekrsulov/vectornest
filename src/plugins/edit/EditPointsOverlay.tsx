import React, { useMemo } from 'react';
import { getCommandStartPoint } from '../../utils/pathParserUtils';
import { clientToCanvas } from '../../utils/pointUtils';
import { useCanvasStore } from '../../store/canvasStore';
import { getEffectiveShift } from '../../utils/effectiveShift';
import { useColorModeValue } from '@chakra-ui/react';
import { getParentCumulativeTransformMatrix } from '../../utils/elementTransformUtils';
import { inverseMatrix, applyToPoint } from '../../utils/matrixUtils';
import type { Point, PathData, Command, CanvasElement } from '../../types';
import { NO_TAP_HIGHLIGHT } from '../../constants';

interface EditPointsOverlayProps {
  element: {
    id: string;
    type: string;
    data: unknown;
    parentId: string | null;
  };
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>;
  editingPoint: {
    elementId: string;
    commandIndex: number;
    pointIndex: number;
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
  } | null;
  draggingSelection: {
    isDragging: boolean;
    draggedPoint: { elementId: string; commandIndex: number; pointIndex: number } | null;
    initialPositions: Array<{
      elementId: string;
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
    startX: number;
    startY: number;
  } | null;
  dragPosition: Point | null;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  getFilteredEditablePoints: (elementId: string) => Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  }>;
  onStartDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void;
  onSelectCommand: (command: { elementId: string; commandIndex: number; pointIndex: number }, multiSelect?: boolean) => void;
}

export const EditPointsOverlay: React.FC<EditPointsOverlayProps> = ({
  element,
  selectedCommands,
  editingPoint,
  draggingSelection,
  dragPosition,
  viewport,
  getFilteredEditablePoints,
  onStartDraggingPoint,
  onSelectCommand,
}) => {
  // Optional integration: Access tool-specific state for visual feedback
  // EditPointsOverlay can show which points are being affected by active tools
  // This is a data dependency for visual feedback, not a behavior dependency

  // Selector specifically for smoothBrush state - returns the same object reference
  // when the relevant properties haven't changed to avoid infinite loops
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smoothBrushState = useCanvasStore(state => (state as any).smoothBrush);

  // Use useMemo to create stable toolState only when smoothBrush actually changes
  const toolState = useMemo((): {
    isActive: boolean;
    affectedPoints: Array<{ commandIndex: number; pointIndex: number; x: number; y: number }>;
  } | null => {
    if (
      smoothBrushState &&
      smoothBrushState.isActive &&
      'affectedPoints' in smoothBrushState
    ) {
      return {
        isActive: smoothBrushState.isActive,
        affectedPoints: smoothBrushState.affectedPoints || []
      };
    }
    return null;
  }, [smoothBrushState]);

  // Get canvas background color based on theme - MUST be called before early return
  const canvasBgColor = useColorModeValue('#f8f9fa', '#212529'); // gray.50 and gray.900
  // Determine if we're in dark mode
  const isDarkMode = useColorModeValue(false, true);
  
  // Get the accumulated transform matrix from parent groups (must be called before any early returns)
  const elements = useCanvasStore(state => state.elements);
  const parentTransformMatrix = useMemo(
    () => getParentCumulativeTransformMatrix(element as CanvasElement, elements),
    [element, elements]
  );
  
  // Convert matrix to SVG transform string
  const transformString = parentTransformMatrix 
    ? `matrix(${parentTransformMatrix.join(',')})`
    : undefined;

  // Compute local drag position by transforming global dragPosition to local coordinates
  // This is needed because the overlay is rendered inside a transformed <g> element
  const localDragPosition = useMemo(() => {
    if (!dragPosition) return null;
    
    const invParent = inverseMatrix(parentTransformMatrix);
    if (!invParent) return dragPosition; // Fallback if matrix not invertible
    
    return applyToPoint(invParent, dragPosition);
  }, [dragPosition, parentTransformMatrix]);

  if (element.type !== 'path') return null;

  const pathData = element.data as PathData;
  const commands = pathData.subPaths.flat();

  // Use filtered points that consider subpath selection
  const points = getFilteredEditablePoints(element.id);

  return (
    <g transform={transformString}>
      {points.map((point, index) => {
        // Use drag position if available, otherwise use original position
        let displayX = point.x;
        let displayY = point.y;

        if (draggingSelection?.isDragging && draggingSelection.draggedPoint) {
          // Handle group drag visualization
          const draggedPoint = draggingSelection.draggedPoint;
          const initialPos = draggingSelection.initialPositions.find(p =>
            p.elementId === element.id &&
            p.commandIndex === point.commandIndex &&
            p.pointIndex === point.pointIndex
          );

          if (initialPos && localDragPosition) {
            // Calculate delta from the dragged point using local coordinates
            const draggedInitialPos = draggingSelection.initialPositions.find(p =>
              p.elementId === draggedPoint.elementId &&
              p.commandIndex === draggedPoint.commandIndex &&
              p.pointIndex === draggedPoint.pointIndex
            );

            if (draggedInitialPos) {
              const deltaX = localDragPosition.x - draggedInitialPos.x;
              const deltaY = localDragPosition.y - draggedInitialPos.y;

              displayX = initialPos.x + deltaX;
              displayY = initialPos.y + deltaY;
            }
          }
        } else if (editingPoint?.isDragging &&
          editingPoint.elementId === element.id &&
          editingPoint.commandIndex === point.commandIndex &&
          editingPoint.pointIndex === point.pointIndex) {
          // Use local drag position for smooth visual feedback during single drag
          if (localDragPosition) {
            displayX = localDragPosition.x;
            displayY = localDragPosition.y;
          }
        }

        const pointStyle = getPointStyle(point, selectedCommands, element, commands, pathData, toolState, canvasBgColor, isDarkMode);

        // Calculate larger hit area for better touch/mouse interaction
        // Use a minimum size in screen pixels (12px) regardless of zoom
        const hitAreaSize = Math.max(12 / viewport.zoom, pointStyle.size / viewport.zoom);

        return (
          <g key={index}>
            {/* Transparent overlay for easier interaction */}
            <circle
              cx={displayX}
              cy={displayY}
              r={hitAreaSize}
              fill="transparent"
              stroke="none"
              style={{
                cursor: 'pointer',
                ...NO_TAP_HIGHLIGHT,
              }}
              onPointerDown={(e) => handlePointPointerDown(e, point, element, selectedCommands, viewport, onStartDraggingPoint, onSelectCommand, toolState)}
            />
            {/* Visible point */}
            {point.isControl ? (
              // Draw square for control points
              (() => {
                const size = pointStyle.size / viewport.zoom;
                return (
                  <rect
                    x={displayX - size / 2}
                    y={displayY - size / 2}
                    width={size}
                    height={size}
                    fill={pointStyle.color}
                    stroke={pointStyle.strokeColor}
                    strokeWidth={2 / viewport.zoom}
                    style={{ pointerEvents: 'none' }} // Let the overlay handle interactions
                  />
                );
              })()
            ) : (
              // Draw circle for command points
              <circle
                cx={displayX}
                cy={displayY}
                r={pointStyle.size / viewport.zoom}
                fill={pointStyle.color}
                stroke={pointStyle.strokeColor}
                strokeWidth={2 / viewport.zoom}
                style={{ pointerEvents: 'none' }} // Let the overlay handle interactions
              />
            )}
          </g>
        );
      })}

      {/* Render control point lines - only for filtered points */}
      <ControlPointLines
        commands={commands}
        points={points}
        element={element}
        editingPoint={editingPoint}
        dragPosition={localDragPosition}
        parentTransformMatrix={parentTransformMatrix}
        viewport={viewport}
        isDarkMode={isDarkMode}
      />
    </g>
  );
};

const getPointStyle = (
  point: {
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  },
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>,
  element: {
    id: string;
    type: string;
    data: unknown;
  },
  commands: Command[],
  pathData: PathData,
  toolState: {
    isActive: boolean;
    affectedPoints: Array<{
      commandIndex: number;
      pointIndex: number;
      x: number;
      y: number;
    }>;
  } | null,
  canvasBgColor?: string,
  isDarkMode?: boolean
) => {
  // Use high contrast colors for dark mode
  let color = isDarkMode ? '#ffffff' : '#000000'; // White in dark mode, black in light mode
  let size = 4;
  let strokeColor = canvasBgColor || (isDarkMode ? '#111827' : '#f9fafb');
  let strokeWidth = 1;

  // Check if this point is selected
  const isSelected = selectedCommands.some(
    cmd => cmd.elementId === element.id &&
      cmd.commandIndex === point.commandIndex &&
      cmd.pointIndex === point.pointIndex
  );

  // Check if this point is affected by smooth brush
  const isAffectedByBrush = toolState?.isActive && toolState.affectedPoints.some(
    (affected) => affected.commandIndex === point.commandIndex &&
      affected.pointIndex === point.pointIndex
  );

  if (isAffectedByBrush) {
    color = '#f59e0b'; // orange color for affected points
    strokeColor = '#92400e'; // darker orange stroke
    strokeWidth = 1.5;
  } else if (isSelected) {
    strokeColor = isDarkMode ? '#fbbf24' : '#eab308'; // Brighter yellow in dark mode
    strokeWidth = 2;
  }

  if (point.isControl) {
    // Control points: cyan/light blue for better visibility in dark mode
    color = isDarkMode ? '#22d3ee' : '#0ea5e9'; // cyan-400 in dark, sky-500 in light
    size = 6; // doubled from 3
  } else {
    // command points
    const cmd = commands[point.commandIndex];
    const isLastCommand = point.commandIndex === commands.length - 1;
    const pointsLength = cmd.type === 'M' || cmd.type === 'L' ? 1 : cmd.type === 'C' ? 3 : 0;
    const isLastPointInCommand = point.pointIndex === pointsLength - 1;
    const isLastPointInPath = isLastCommand && isLastPointInCommand && cmd.type !== 'Z';

    // Check if this is the end of a sub-path
    let isEndOfSubPath = false;
    let cumulativeIndex = 0;
    for (const subPath of pathData.subPaths) {
      const subPathStartIndex = cumulativeIndex;
      const subPathEndIndex = cumulativeIndex + subPath.length - 1;
      if (point.commandIndex >= subPathStartIndex && point.commandIndex <= subPathEndIndex) {
        isEndOfSubPath = point.commandIndex === subPathEndIndex && isLastPointInCommand && cmd.type !== 'Z';
        break;
      }
      cumulativeIndex += subPath.length;
    }

    if (cmd.type === 'M') {
      // Initial points: bright green for high visibility
      color = isDarkMode ? '#4ade80' : '#22c55e'; // green-400 in dark, green-500 in light
      size = 6; // larger
    } else if (isLastPointInPath || isEndOfSubPath) {
      // End points: bright red/pink for high visibility
      color = isDarkMode ? '#f87171' : '#ef4444'; // red-400 in dark, red-500 in light
      size = 3; // smaller
    } else {
      // Intermediate command points: cyan/light blue
      color = isDarkMode ? '#22d3ee' : '#0ea5e9'; // cyan-400 in dark, sky-500 in light
      size = 4;
    }
  }

  return { color, size, strokeColor, strokeWidth };
};

const handlePointPointerDown = (
  e: React.PointerEvent,
  point: {
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  },
  element: {
    id: string;
    type: string;
    data: unknown;
  },
  selectedCommands: Array<{
    elementId: string;
    commandIndex: number;
    pointIndex: number;
  }>,
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  },
  onStartDraggingPoint: (elementId: string, commandIndex: number, pointIndex: number, offsetX: number, offsetY: number) => void,
  onSelectCommand: (command: { elementId: string; commandIndex: number; pointIndex: number }, multiSelect?: boolean) => void,
  toolState: {
    isActive: boolean;
    affectedPoints: Array<{ commandIndex: number; pointIndex: number; x: number; y: number }>;
  } | null
) => {
  e.stopPropagation();

  // Disable point interaction when smooth brush is active
  if (toolState?.isActive) return;

  // Get virtual shift state
  const isVirtualShiftActive = useCanvasStore.getState().isVirtualShiftActive;
  const effectiveShiftKey = getEffectiveShift(e.shiftKey, isVirtualShiftActive);

  // Check if this point is already selected
  const isAlreadySelected = selectedCommands.some(cmd =>
    cmd.elementId === element.id &&
    cmd.commandIndex === point.commandIndex &&
    cmd.pointIndex === point.pointIndex
  );

  // Handle selection logic
  if (effectiveShiftKey) {
    // Shift+click: toggle selection (add/remove from selection)
    onSelectCommand({
      elementId: element.id,
      commandIndex: point.commandIndex,
      pointIndex: point.pointIndex
    }, true);
  } else if (!isAlreadySelected) {
    // Normal click on unselected point: select it (clear others)
    onSelectCommand({
      elementId: element.id,
      commandIndex: point.commandIndex,
      pointIndex: point.pointIndex
    }, false);
  }
  // If point is already selected and no shift, keep it selected (no action needed)

  // Only start dragging if not using shift (to avoid accidental drags during selection)
  if (!effectiveShiftKey) {
    // Get mouse coordinates relative to SVG
    const svgElement = (e.currentTarget as SVGElement).ownerSVGElement;
    if (svgElement) {
      // Convert to canvas coordinates
      const canvasPoint = clientToCanvas(e.clientX, e.clientY, svgElement, viewport);

      onStartDraggingPoint(element.id, point.commandIndex, point.pointIndex, canvasPoint.x, canvasPoint.y);
    } else {
      // Fallback to original coordinates
      onStartDraggingPoint(element.id, point.commandIndex, point.pointIndex, point.x, point.y);
    }
  }
};

const ControlPointLines: React.FC<{
  commands: Command[];
  points: Array<{
    commandIndex: number;
    pointIndex: number;
    x: number;
    y: number;
    isControl: boolean;
  }>;
  element: {
    id: string;
    type: string;
    data: unknown;
  };
  editingPoint: {
    elementId: string;
    commandIndex: number;
    pointIndex: number;
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
  } | null;
  dragPosition: Point | null;
  parentTransformMatrix: number[];
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  isDarkMode: boolean;
}> = ({ commands, points, element, editingPoint, dragPosition, parentTransformMatrix, viewport, isDarkMode }) => {
  // Use high contrast color for control point lines in dark mode
  const lineColor = isDarkMode ? '#22d3ee' : '#0ea5e9'; // cyan-400 in dark, sky-500 in light

  return (
    <>
      {commands.map((cmd, cmdIndex) => {
        if (cmd.type === 'C') {
          // Check if this command has any control points in the filtered points list
          const hasFilteredControlPoints = points.some(point =>
            point.commandIndex === cmdIndex && (point.pointIndex === 0 || point.pointIndex === 1)
          );

          // Only render lines if this command's control points are included in filtered points
          if (!hasFilteredControlPoints) {
            return null;
          }

          const startPoint = getCommandStartPoint(commands, cmdIndex);
          if (startPoint) {
            let control1X = cmd.controlPoint1.x;
            let control1Y = cmd.controlPoint1.y;
            let control2X = cmd.controlPoint2.x;
            let control2Y = cmd.controlPoint2.y;
            const endX = cmd.position.x;
            const endY = cmd.position.y;

            // Update control point positions if being dragged
            if (editingPoint?.isDragging && editingPoint.elementId === element.id) {
              // Use dragPosition if available, otherwise transform editingPoint offset to local coordinates
              let dragX: number;
              let dragY: number;
              
              if (dragPosition) {
                // dragPosition is already in local coordinates
                dragX = dragPosition.x;
                dragY = dragPosition.y;
              } else {
                // Transform editingPoint offset from global to local coordinates
                const invParent = inverseMatrix(parentTransformMatrix as [number, number, number, number, number, number]);
                if (invParent) {
                  const localPoint = applyToPoint(invParent, { x: editingPoint.offsetX, y: editingPoint.offsetY });
                  dragX = localPoint.x;
                  dragY = localPoint.y;
                } else {
                  dragX = editingPoint.offsetX;
                  dragY = editingPoint.offsetY;
                }
              }

              if (editingPoint.commandIndex === cmdIndex && editingPoint.pointIndex === 0) {
                control1X = dragX;
                control1Y = dragY;
              } else if (editingPoint.commandIndex === cmdIndex && editingPoint.pointIndex === 1) {
                control2X = dragX;
                control2Y = dragY;
              }
            }

            return (
              <g key={`lines-${cmdIndex}`}>
                <line
                  x1={startPoint.x}
                  y1={startPoint.y}
                  x2={control1X}
                  y2={control1Y}
                  stroke={lineColor}
                  strokeWidth={1 / viewport.zoom}
                />
                <line
                  x1={control2X}
                  y1={control2Y}
                  x2={endX}
                  y2={endY}
                  stroke={lineColor}
                  strokeWidth={1 / viewport.zoom}
                />
              </g>
            );
          }
        }
        return null;
      })}
    </>
  );
};
