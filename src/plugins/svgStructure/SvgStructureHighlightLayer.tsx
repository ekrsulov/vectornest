import React from 'react';
import { useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { useFrozenElementsDuringDrag } from '../../hooks/useFrozenElementsDuringDrag';
import { buildElementMap } from '../../utils';
import { getCanvasElementBounds } from '../../utils/canvasElementBounds';

/**
 * Layer that renders a visual highlight on the canvas for the element
 * currently hovered in the SVG Structure panel.
 */
export const SvgStructureHighlightLayer: React.FC = () => {
  const elements = useFrozenElementsDuringDrag();
  const elementMap = React.useMemo(() => buildElementMap(elements), [elements]);

  const hoveredId = useCanvasStore((state) => (state as { hoveredStructureElementId?: string | null }).hoveredStructureElementId ?? null);

  // Color that works in both light and dark modes
  const highlightColor = useColorModeValue('rgba(59, 130, 246, 0.4)', 'rgba(96, 165, 250, 0.4)');
  const strokeColor = useColorModeValue('rgba(59, 130, 246, 0.8)', 'rgba(96, 165, 250, 0.8)');

  if (!hoveredId) return null;

  const element = elementMap.get(hoveredId);
  if (!element) return null;

  const bounds = getCanvasElementBounds(element, {
    viewport: { zoom: 1, panX: 0, panY: 0 },
    elementMap,
  });

  if (!bounds) return null;

  return (
    <g pointerEvents="none">
      {/* Fill highlight */}
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.maxX - bounds.minX}
        height={bounds.maxY - bounds.minY}
        fill={highlightColor}
        stroke="none"
      />
      {/* Border highlight */}
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.maxX - bounds.minX}
        height={bounds.maxY - bounds.minY}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray="5,3"
      />
    </g>
  );
};
