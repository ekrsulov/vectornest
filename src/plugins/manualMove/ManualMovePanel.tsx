import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { VStack, HStack, Text } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { NumberInput } from '../../ui/NumberInput';
import { useCanvasStore } from '../../store/canvasStore';
import { buildElementMap } from '../../utils';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import type { Command, CanvasElement, PathData } from '../../types';
import { getGroupThumbnailCommands, buildNativeShapeThumbnailCommands } from '../../utils/selectPanelHelpers';
import { getAccumulatedTransformMatrix, getParentCumulativeTransformMatrix } from '../../utils/elementTransformUtils';
import { applyToPoint, type Matrix } from '../../utils/matrixUtils';

const textProps = {
  fontSize: '12px',
  color: 'gray.600',
  _dark: { color: 'gray.400' },
};

const transformCommandPoints = (commands: Command[], matrix: Matrix): Command[] =>
  commands.map((cmd) => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      return { ...cmd, position: applyToPoint(matrix, cmd.position) };
    }
    if (cmd.type === 'C') {
      return {
        ...cmd,
        controlPoint1: { ...cmd.controlPoint1, ...applyToPoint(matrix, cmd.controlPoint1) },
        controlPoint2: { ...cmd.controlPoint2, ...applyToPoint(matrix, cmd.controlPoint2) },
        position: applyToPoint(matrix, cmd.position),
      };
    }
    return cmd;
  });

const computeBoundsFromCommands = (commands: Command[] | null | undefined) => {
  if (!commands?.length) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let hasPoint = false;

  const addPoint = (pt?: { x: number; y: number }) => {
    if (pt == null) return;
    hasPoint = true;
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  };

  commands.forEach((cmd) => {
    switch (cmd.type) {
      case 'M':
      case 'L':
        addPoint(cmd.position);
        break;
      case 'C':
        addPoint(cmd.position);
        addPoint(cmd.controlPoint1);
        addPoint(cmd.controlPoint2);
        break;
      default:
        break;
    }
  });

  if (!hasPoint) return null;
  return { minX, minY, maxX, maxY };
};

const rectToCommands = (bounds: { minX: number; minY: number; maxX: number; maxY: number }): Command[] => ([
  { type: 'M', position: { x: bounds.minX, y: bounds.minY } },
  { type: 'L', position: { x: bounds.maxX, y: bounds.minY } },
  { type: 'L', position: { x: bounds.maxX, y: bounds.maxY } },
  { type: 'L', position: { x: bounds.minX, y: bounds.maxY } },
  { type: 'Z' },
]);

const getWorldCommandsForElement = (
  el: CanvasElement,
  elements: CanvasElement[],
  elementMap: Map<string, CanvasElement>,
  visited: Set<string>
): Command[] => {
  if (visited.has(el.id)) return [];
  visited.add(el.id);

  const parentMatrix = getParentCumulativeTransformMatrix(el, elements);
  const accumulatedMatrix = getAccumulatedTransformMatrix(el.id, elements);
  const applyParent = (cmds: Command[]) => transformCommandPoints(cmds, parentMatrix);
  const applyAccumulated = (cmds: Command[]) => transformCommandPoints(cmds, accumulatedMatrix);

  if (el.type === 'path') {
    const cmds = (el.data as PathData).subPaths.flat();
    return applyAccumulated(cmds);
  }

  if (el.type === 'group') {
    const ids = (el.data as { childIds?: string[] }).childIds ?? [];
    const childCommands: Command[] = [];
    ids.forEach((childId) => {
      const child = elementMap.get(childId);
      if (child) {
        childCommands.push(...getWorldCommandsForElement(child, elements, elementMap, visited));
      }
    });
    if (childCommands.length) {
      return childCommands;
    }
    const bounds = elementContributionRegistry.getBounds(el, {
      viewport: { zoom: 1, panX: 0, panY: 0 },
      elementMap,
    });
    return bounds ? applyAccumulated(rectToCommands(bounds)) : [];
  }

  if (el.type === 'nativeShape') {
    const cmds = buildNativeShapeThumbnailCommands(el.data as never);
    // Own transform already applied in helper; apply parent chain to position in world
    return applyParent(cmds);
  }

  const bounds = elementContributionRegistry.getBounds(el, {
    viewport: { zoom: 1, panX: 0, panY: 0 },
    elementMap,
  });
  if (bounds) {
    return applyAccumulated(rectToCommands(bounds));
  }

  const cmds = (el.data as { subPaths?: Command[][] })?.subPaths?.flat?.() ?? [];
  return cmds.length ? applyAccumulated(cmds) : [];
};

/**
 * Calculate bounds for selected elements - extracted to avoid closure over elements
 */
const calculateSelectionBounds = (
  selectedIds: string[],
  getElements: () => CanvasElement[]
) => {
  if (!selectedIds.length) return null;

  const elements = getElements();
  const elementMap = buildElementMap(elements);

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let found = false;

  selectedIds.forEach((id) => {
    const visited = new Set<string>();
    const el = elementMap.get(id);
    if (!el) return;
    let bounds = computeBoundsFromCommands(
      getWorldCommandsForElement(el, elements, elementMap, visited)
    );
    if (!bounds && el.type === 'group') {
      const accumMatrix = getAccumulatedTransformMatrix(el.id, elements);
      const cmds = transformCommandPoints(
        getGroupThumbnailCommands((el.data as { childIds?: string[] }).childIds, elements),
        accumMatrix
      );
      bounds = computeBoundsFromCommands(cmds);
    }
    if (!bounds) return;
    found = true;
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  if (!found) return null;
  return { minX, minY, maxX, maxY };
};

export const ManualMovePanel: React.FC = () => {
  // Only subscribe to selectedIds - not elements (to avoid re-render on every move)
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const moveSelectedElements = useCanvasStore((state) => state.moveSelectedElements);

  const [targetX, setTargetX] = useState<number>(0);
  const [targetY, setTargetY] = useState<number>(0);

  // Store bounds in ref to avoid recalculating during renders
  const boundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const lastSelectedIdsRef = useRef<string[]>([]);

  // Recalculate bounds only when showContent changes to true or selection changes
  const recalculateBounds = useCallback(() => {
    const bounds = calculateSelectionBounds(selectedIds, () => useCanvasStore.getState().elements);
    boundsRef.current = bounds;
    if (bounds) {
      setTargetX(parseFloat(bounds.minX.toFixed(2)));
      setTargetY(parseFloat(bounds.minY.toFixed(2)));
    }
  }, [selectedIds]);

  // Track selection changes
  const selectionKey = useMemo(() => selectedIds.join(','), [selectedIds]);

  // Recalculate bounds when selection changes
  useEffect(() => {
    if (lastSelectedIdsRef.current.join(',') !== selectionKey) {
      lastSelectedIdsRef.current = [...selectedIds];
      recalculateBounds();
    }
  }, [selectionKey, selectedIds, recalculateBounds]);

  // Initial calculation
  useEffect(() => {
    if (!boundsRef.current && selectedIds.length > 0) {
      recalculateBounds();
    }
  }, [selectedIds, recalculateBounds]);

  const handleApply = useCallback(() => {
    const bounds = boundsRef.current;
    if (!bounds) return;
    const deltaX = targetX - bounds.minX;
    const deltaY = targetY - bounds.minY;
    moveSelectedElements(deltaX, deltaY, 3);
    // Recalculate bounds after move
    setTimeout(recalculateBounds, 0);
  }, [targetX, targetY, moveSelectedElements, recalculateBounds]);

  const handleReset = useCallback(() => {
    recalculateBounds();
  }, [recalculateBounds]);

  const selectionBounds = boundsRef.current;

  return (
    <Panel
      title="Manual Move"
      isCollapsible
      defaultOpen={false}
    >
      <VStack spacing={1} align="stretch">
          <Text {...textProps}>
            Set the new top-left position for the current selection.
          </Text>
          <HStack spacing={2}>
            <NumberInput
              label="X"
              value={targetX}
              onChange={(value) => setTargetX(value)}
              min={-1_000_000}
              max={1_000_000}
              step={0.5}
            />
            <NumberInput
              label="Y"
              value={targetY}
              onChange={(value) => setTargetY(value)}
              min={-1_000_000}
              max={1_000_000}
              step={0.5}
            />
          </HStack>
          <HStack spacing={2}>
            <PanelStyledButton
              size="xs"
              onClick={handleApply}
              isDisabled={!selectionBounds}
            >
              Apply
            </PanelStyledButton>
            <PanelStyledButton
              size="xs"
              variant="ghost"
              onClick={handleReset}
              isDisabled={!selectionBounds}
            >
              Reset
            </PanelStyledButton>
          </HStack>
          {!selectionBounds && (
            <Text {...textProps}>No measurable bounds for current selection.</Text>
          )}
        </VStack>
    </Panel>
  );
};
