import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { VStack, HStack, Text, Box, useColorModeValue } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { NumberInput } from '../../ui/NumberInput';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { PanelToggle } from '../../ui/PanelToggle';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { CanvasElement, Command, PathData, GroupData } from '../../types';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import { buildElementMap } from '../../utils';
import { applyToPoint, createTranslateMatrix, inverseMatrix, type Matrix } from '../../utils/matrixUtils';
import { getAccumulatedTransformMatrix, getParentCumulativeTransformMatrix } from '../../utils/elementTransformUtils';
import { buildNativeShapeThumbnailCommands, getGroupThumbnailCommands } from '../../utils/selectPanelHelpers';
import { sortEntriesForGrid } from './orderSelectionEntries';

const textProps = {
  fontSize: '12px',
  color: 'gray.600',
  _dark: { color: 'gray.400' },
};

type SelectionEntry = { element: CanvasElement; bounds: { minX: number; minY: number; maxX: number; maxY: number } };

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
    if (!pt) return;
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

const computeGroupWorldBounds = (
  group: CanvasElement,
  _elements: CanvasElement[],
  elementMap: Map<string, CanvasElement>
) => {
  if (group.type !== 'group') return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let found = false;

  const queue = [...((group.data as { childIds?: string[] }).childIds ?? [])];
  while (queue.length) {
    const id = queue.shift();
    if (!id) continue;
    const child = elementMap.get(id);
    if (!child) continue;
    if (child.type === 'group') {
      const b = elementContributionRegistry.getBounds(child, {
        viewport: { zoom: 1, panX: 0, panY: 0 },
        elementMap,
      });
      if (b) {
        found = true;
        minX = Math.min(minX, b.minX);
        minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX);
        maxY = Math.max(maxY, b.maxY);
      }
      const childIds = (child.data as { childIds?: string[] }).childIds ?? [];
      queue.push(...childIds);
      continue;
    }
    const bounds = elementContributionRegistry.getBounds(child, {
      viewport: { zoom: 1, panX: 0, panY: 0 },
      elementMap,
    });
    if (!bounds) continue;
    found = true;
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  if (!found) return null;
  return { minX, minY, maxX, maxY };
};

const getWorldCommands = (
  el: CanvasElement,
  elements: CanvasElement[],
  elementMap: Map<string, CanvasElement>
): Command[] => {
  const accum = getAccumulatedTransformMatrix(el.id, elements);
  if (el.type === 'path') {
    const cmds = (el.data as PathData).subPaths.flat();
    return transformCommandPoints(cmds, accum);
  }
  if (el.type === 'group') {
    const groupBounds = computeGroupWorldBounds(el, elements, elementMap);
    if (groupBounds) {
      return [
        { type: 'M', position: { x: groupBounds.minX, y: groupBounds.minY } },
        { type: 'L', position: { x: groupBounds.maxX, y: groupBounds.minY } },
        { type: 'L', position: { x: groupBounds.maxX, y: groupBounds.maxY } },
        { type: 'L', position: { x: groupBounds.minX, y: groupBounds.maxY } },
        { type: 'Z' },
      ];
    }
    const cmds = getGroupThumbnailCommands((el.data as { childIds?: string[] }).childIds, elements);
    return transformCommandPoints(cmds, accum);
  }
  if (el.type === 'nativeShape') {
    const cmds = buildNativeShapeThumbnailCommands(el.data as never);
    const parentMatrix = getParentCumulativeTransformMatrix(el, elements);
    return transformCommandPoints(cmds, parentMatrix);
  }
  const bounds = elementContributionRegistry.getBounds(el, {
    viewport: { zoom: 1, panX: 0, panY: 0 },
    elementMap,
  });
  if (bounds) {
    const rect: Command[] = [
      { type: 'M', position: { x: bounds.minX, y: bounds.minY } },
      { type: 'L', position: { x: bounds.maxX, y: bounds.minY } },
      { type: 'L', position: { x: bounds.maxX, y: bounds.maxY } },
      { type: 'L', position: { x: bounds.minX, y: bounds.maxY } },
      { type: 'Z' },
    ];
    return transformCommandPoints(rect, accum);
  }
  return [];
};

const getSelectionEntries = (elements: CanvasElement[], selectedIds: string[]) => {
  const elementMap = buildElementMap(elements);
  const entries: SelectionEntry[] = [];

  selectedIds.forEach((id) => {
    const el = elementMap.get(id);
    if (!el) return;
    let bounds =
      el.type !== 'group'
        ? elementContributionRegistry.getBounds(el, {
          viewport: { zoom: 1, panX: 0, panY: 0 },
          elementMap,
        })
        : null;

    if (el.type === 'group') {
      bounds = computeGroupWorldBounds(el, elements, elementMap);
    }

    if (!bounds) {
      const cmds = getWorldCommands(el, elements, elementMap);
      const commandBounds = computeBoundsFromCommands(cmds);
      bounds = commandBounds ?? bounds;
    }
    if (!bounds) return;
    entries.push({ element: el, bounds });
  });

  return entries;
};

const toLocalDelta = (dx: number, dy: number, elements: CanvasElement[], element: CanvasElement) => {
  const parentMatrix = getParentCumulativeTransformMatrix(element, elements);
  const inv = inverseMatrix(parentMatrix) ?? parentMatrix;
  return {
    x: inv[0] * dx + inv[2] * dy,
    y: inv[1] * dx + inv[3] * dy,
  };
};

export const GridDistributionPanel: React.FC = () => {
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const updateElement = useCanvasStore((state) => state.updateElement);
  const addElement = useCanvasStore((state) => state.addElement);
  const strokeColor = useColorModeValue('#000', '#fff');

  const [startX, setStartX] = useState<number>(0);
  const [startY, setStartY] = useState<number>(0);
  const [padding, setPadding] = useState<number>(50);
  const [showGridLines, setShowGridLines] = useState<boolean>(false);
  const [persistGridLines, setPersistGridLines] = useState<boolean>(false);

  // Ref for selection entries to avoid re-renders during drag
  const selectionEntriesRef = useRef<SelectionEntry[]>([]);
  const lastSelectedIdsRef = useRef<string[]>([]);
  // We need a force update to trigger re-render when we recalculate entries
  const [, setForceUpdate] = useState({});

  const recalculateEntries = useCallback(() => {
    const elements = useCanvasStore.getState().elements;
    const entries = getSelectionEntries(elements, selectedIds);
    selectionEntriesRef.current = entries;
    setForceUpdate({});
  }, [selectedIds]);

  const selectionKey = useMemo(() => selectedIds.join(','), [selectedIds]);

  // Recalculate when selection changes
  useEffect(() => {
    if (lastSelectedIdsRef.current.join(',') !== selectionKey) {
      lastSelectedIdsRef.current = [...selectedIds];
      recalculateEntries();
    }
  }, [selectionKey, selectedIds, recalculateEntries]);

  // Initial calculation
  useEffect(() => {
    if (selectionEntriesRef.current.length === 0 && selectedIds.length > 0) {
      recalculateEntries();
    }
  }, [selectedIds, recalculateEntries]);

  const selectionEntries = selectionEntriesRef.current;

  const buildGridLayout = useCallback((entries: SelectionEntry[]) => {
    if (!entries.length) return null;
    const widths = entries.map((e) => e.bounds.maxX - e.bounds.minX);
    const heights = entries.map((e) => e.bounds.maxY - e.bounds.minY);
    const maxWidth = Math.max(...widths);
    const maxHeight = Math.max(...heights);
    const cellWidth = maxWidth + padding;
    const cellHeight = maxHeight + padding;
    const columns = Math.ceil(Math.sqrt(entries.length));
    const rows = Math.ceil(entries.length / columns);
    return { cellWidth, cellHeight, columns, rows };
  }, [padding]);

  const buildGridLines = useCallback((layout: { cellWidth: number; cellHeight: number; columns: number; rows: number }) => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const totalWidth = layout.columns * layout.cellWidth;
    const totalHeight = layout.rows * layout.cellHeight;
    for (let c = 0; c <= layout.columns; c++) {
      const x = startX + c * layout.cellWidth;
      lines.push({ x1: x, y1: startY, x2: x, y2: startY + totalHeight });
    }
    for (let r = 0; r <= layout.rows; r++) {
      const y = startY + r * layout.cellHeight;
      lines.push({ x1: startX, y1: y, x2: startX + totalWidth, y2: y });
    }
    return lines;
  }, [startX, startY]);

  const handleDistribute = useCallback(() => {
    const state = useCanvasStore.getState() as CanvasStore;
    const entries = sortEntriesForGrid(getSelectionEntries(state.elements, state.selectedIds));
    if (entries.length < 2) return;

    const layout = buildGridLayout(entries);
    if (!layout) return;

    entries.forEach((entry, index) => {
      const col = index % layout.columns;
      const row = Math.floor(index / layout.columns);
      const targetCenter = {
        x: startX + col * layout.cellWidth + layout.cellWidth / 2,
        y: startY + row * layout.cellHeight + layout.cellHeight / 2,
      };
      const currentCenter = {
        x: (entry.bounds.minX + entry.bounds.maxX) / 2,
        y: (entry.bounds.minY + entry.bounds.maxY) / 2,
      };
      const deltaWorld = {
        x: targetCenter.x - currentCenter.x,
        y: targetCenter.y - currentCenter.y,
      };
      const localDelta = toLocalDelta(deltaWorld.x, deltaWorld.y, state.elements, entry.element);
      const translate = createTranslateMatrix(localDelta.x, localDelta.y);
      const transformed = elementContributionRegistry.applyAffineTransform(entry.element, translate, 3);
      if (transformed) {
        updateElement(entry.element.id, {
          data: transformed.data,
          parentId: transformed.parentId,
          type: transformed.type,
        });
      }
    });

    if (persistGridLines) {
      const lines = buildGridLines(layout);
      const lineIds: string[] = [];
      lines.forEach((line) => {
        const pathElement = {
          type: 'path' as const,
          parentId: null,
          data: {
            subPaths: [
              [
                { type: 'M', position: { x: line.x1, y: line.y1 } },
                { type: 'L', position: { x: line.x2, y: line.y2 } },
              ],
            ],
            strokeWidth: 1,
            strokeColor,
            strokeOpacity: 1,
            fillColor: 'transparent',
            fillOpacity: 0,
            strokeLinecap: 'round',
            strokeLinejoin: 'miter',
          },
        };
        const id = addElement(pathElement as unknown as CanvasElement);
        lineIds.push(id);
      });

      const groupData: GroupData = {
        childIds: lineIds,
        name: 'Grid Lines',
        isLocked: false,
        isHidden: false,
        isExpanded: true,
        transform: {
          translateX: 0,
          translateY: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      };

      const groupId = addElement({
        type: 'group',
        parentId: null,
        data: groupData,
      } as unknown as CanvasElement);

      lineIds.forEach((lineId) => {
        updateElement(lineId, { parentId: groupId });
      });
    }
  }, [buildGridLayout, startX, startY, updateElement, persistGridLines, buildGridLines, addElement, strokeColor]);

  useEffect(() => {
    if (!showGridLines) {
      useCanvasStore.setState((prev) => ({
        ...prev,
        gridDistributionOverlay: { visible: false, lines: [] },
      }));
      return;
    }
    if (selectionEntries.length < 2) {
      useCanvasStore.setState((prev) => ({
        ...prev,
        gridDistributionOverlay: { visible: false, lines: [] },
      }));
      return;
    }
    const layout = buildGridLayout(selectionEntries);
    if (!layout) return;
    const lines = buildGridLines(layout);
    useCanvasStore.setState((prev) => ({
      ...prev,
      gridDistributionOverlay: {
        visible: true,
        lines,
      },
    }));
  }, [buildGridLayout, buildGridLines, selectionEntries, showGridLines]);

  useEffect(() => () => {
    useCanvasStore.setState((prev) => ({
      ...prev,
      gridDistributionOverlay: { visible: false, lines: [] },
    }));
  }, []);

  return (
    <Panel
      title="Grid Distribution"
      isCollapsible
      defaultOpen={false}
    >
      <VStack spacing={1} align="stretch">
          <Text {...textProps}>
            Arrange the selection into a grid starting at the specified origin.
          </Text>
          <HStack spacing={2}>
            <NumberInput
              label="Start X"
              value={startX}
              onChange={(v) => setStartX(v)}
              min={-1_000_000}
              max={1_000_000}
              step={1}
            />
            <NumberInput
              label="Start Y"
              value={startY}
              onChange={(v) => setStartY(v)}
              min={-1_000_000}
              max={1_000_000}
              step={1}
            />
          </HStack>
          <Box pr={0.5}>
            <SliderControl
              label="Padding"
              value={padding}
              min={0}
              max={500}
              step={1}
              onChange={(v) => setPadding(v)}
              formatter={(v) => `${v}px`}
              marginBottom="0"
            />
          </Box>
          <PanelToggle
            isChecked={showGridLines}
            onChange={(e) => setShowGridLines(e.target.checked)}
          >
            Show grid lines
          </PanelToggle>
          <PanelToggle
            isChecked={persistGridLines}
            onChange={(e) => setPersistGridLines(e.target.checked)}
          >
            Keep grid lines on canvas
          </PanelToggle>
          <PanelStyledButton
            size="xs"
            onClick={handleDistribute}
            isDisabled={selectionEntries.length < 2}
          >
            Distribute
          </PanelStyledButton>
        </VStack>
    </Panel>
  );
};
