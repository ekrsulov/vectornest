import React from 'react';
import { deriveElementSelectionColors } from '../../utils/canvasColorUtils';
import { commandsToString } from '../../utils/pathParserUtils';
import { clientToCanvas } from '../../utils/pointUtils';
import { useCanvasStore } from '../../store/canvasStore';
import { getEffectiveShift } from '../../utils/effectiveShift';
import { pluginManager } from '../../utils/pluginManager';
import { getParentCumulativeTransformMatrix } from '../../utils/elementTransformUtils';
import type { PathData, SubPath, Point, CanvasElement } from '../../types';
import { NO_TAP_HIGHLIGHT } from '../../constants';

interface SubpathOverlayProps {
  element: {
    id: string;
    type: string;
    data: unknown;
    zIndex: number;
    parentId: string | null;
  };
  selectedSubpaths: Array<{
    elementId: string;
    subpathIndex: number;
  }>;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  onSelectSubpath: (elementId: string, subpathIndex: number, multiSelect?: boolean) => void;
  onSetDragStart: (point: Point) => void;
  onSubpathDoubleClick: (elementId: string, subpathIndex: number, e: React.MouseEvent<SVGPathElement>) => void;
  onSubpathTouchEnd: (elementId: string, subpathIndex: number, e: React.TouchEvent<SVGPathElement>) => void;
  isVisible?: boolean; // New prop to control visibility
}

export const SubpathOverlay: React.FC<SubpathOverlayProps> = ({
  element,
  selectedSubpaths,
  viewport,
  onSelectSubpath,
  onSetDragStart,
  onSubpathDoubleClick,
  onSubpathTouchEnd,
  isVisible = true,
}) => {
  // Get the accumulated transform matrix from parent groups (must be called before any early returns)
  const elements = useCanvasStore(state => state.elements);
  
  if (element.type !== 'path') return null;

  const pathData = element.data as PathData;

  // Use the current path data (which may be updated during dragging) instead of original
  const subpaths = pathData.subPaths;

  // Calculate contrasting colors for the overlay based on element's colors
  const { selectionColor: overlayColor, elementStrokeWidth } = deriveElementSelectionColors(element);

  const parentMatrix = getParentCumulativeTransformMatrix(element as CanvasElement, elements);
  
  // Convert matrix to SVG transform string
  const transformString = parentMatrix 
    ? `matrix(${parentMatrix.join(',')})`
    : undefined;

  return (
    <g transform={transformString}>
      {subpaths.map((subpathData: SubPath, index: number) => {
        // Check if this subpath is selected
        const isSubpathSelected = selectedSubpaths.some(
          s => s.elementId === element.id && s.subpathIndex === index
        );

        // Different colors for selected and unselected subpaths
        const overlayFill = isVisible ? (isSubpathSelected ? `${overlayColor}40` : `${overlayColor}15`) : 'transparent'; // More opacity for selected
        const overlayStroke = isVisible ? (isSubpathSelected ? `${overlayColor}80` : `${overlayColor}40`) : 'transparent'; // Stronger stroke for selected
        const strokeWidth = isVisible ? (isSubpathSelected ? (elementStrokeWidth + 1) / viewport.zoom : elementStrokeWidth / viewport.zoom) : 0;

        return (
          <path
            key={index}
            data-element-id={element.id}
            data-subpath-index={index}
            d={commandsToString(subpathData)}
            fill={overlayFill}
            stroke={overlayStroke}
            strokeWidth={strokeWidth}
            strokeLinecap={pathData.strokeLinecap || "round"}
            strokeLinejoin={pathData.strokeLinejoin || "round"}
            fillRule={pathData.fillRule || "nonzero"}
            strokeDasharray={pathData.strokeDasharray && pathData.strokeDasharray !== 'none' ? pathData.strokeDasharray : undefined}
            style={{
              cursor: 'pointer',
              ...NO_TAP_HIGHLIGHT,
              // Removed the transform - the overlay should follow the updated path data
            }}
            onPointerDown={isVisible ? (e) => {
              // Don't stop propagation - let Canvas handlePointerDown also run to set dragStart

              // Check if active plugin prevents subpath interaction (e.g., drawing tools)
              if (pluginManager.shouldPreventSubpathInteraction()) {
                return;
              }

              // Get virtual shift state
              const isVirtualShiftActive = useCanvasStore.getState().isVirtualShiftActive;
              const effectiveShiftKey = getEffectiveShift(e.shiftKey, isVirtualShiftActive);

              // Check if this is a click for selection or start of drag
              if (effectiveShiftKey) {
                // Shift+click for multiselect
                onSelectSubpath(element.id, index, true);
              } else {
                // Regular click - check if already selected
                const isAlreadySelected = selectedSubpaths.some(
                  s => s.elementId === element.id && s.subpathIndex === index
                );

                if (!isAlreadySelected) {
                  // Select this subpath if not already selected
                  onSelectSubpath(element.id, index, false);
                }

                // Start dragging
                const svgElement = (e.currentTarget as SVGElement).ownerSVGElement;
                if (svgElement) {
                  // Convert to canvas coordinates
                  const canvasPoint = clientToCanvas(e.clientX, e.clientY, svgElement, viewport);

                  // Set drag start for subpaths
                  onSetDragStart(canvasPoint);
                }
              }
            } : undefined}
            onPointerMove={isVisible ? () => {
              // Let Canvas handle all pointer move events for subpaths
              // The overlay just needs to ensure the drag is started correctly
            } : undefined}
            onDoubleClick={(e) => onSubpathDoubleClick(element.id, index, e)}
            onTouchEnd={(e) => onSubpathTouchEnd(element.id, index, e)}
          />
        );
      })}
    </g>
  );
};
