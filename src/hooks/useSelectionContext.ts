import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import { getPointFromSelection } from '../utils/pathParserUtils';
import { buildElementMap } from '../utils/elementMapUtils';
import type { SelectionContextInfo } from '../types/selection';

/**
 * Hook that determines the current selection context based on store state.
 * Centralizes the logic for determining what type of selection is active.
 * 
 * Priority: commands > subpaths > elements
 * 
 * Optimization: Only subscribes to selection-related state (selectedIds,
 * selectedCommands, selectedSubpaths). Element lookups use getState() since
 * element types are structurally immutable — a path stays a path, a group
 * stays a group. This avoids re-renders on every element mutation (style,
 * position, etc.) that doesn't affect the selection context.
 */
export function useSelectionContext(): SelectionContextInfo | null {
  const { selectedIds, selectedCommands, selectedSubpaths } = useCanvasStore(
    useShallow((state) => ({
      selectedIds: state.selectedIds,
      selectedCommands: state.selectedCommands,
      selectedSubpaths: state.selectedSubpaths,
    }))
  );

  return useMemo(() => {
    // Read elements snapshot only when we need type/point info
    const elements = useCanvasStore.getState().elements;
    // Priority: commands > subpaths > elements
    if (selectedCommands && selectedCommands.length > 0) {
      // Determine the exact point type
      const cmd = selectedCommands[0];
      const result = getPointFromSelection(cmd, elements);

      if (result) {
        const { point, command } = result;
        if (point.isControl) {
          return { type: 'point-control', pointInfo: cmd };
        } else {
          if (command.type === 'M') {
            return { type: 'point-anchor-m', pointInfo: cmd };
          } else if (command.type === 'L') {
            return { type: 'point-anchor-l', pointInfo: cmd };
          } else if (command.type === 'C') {
            return { type: 'point-anchor-c', pointInfo: cmd };
          }
        }
      }
      // Fallback
      return { type: 'point-anchor-m', pointInfo: cmd };
    }

    if (selectedSubpaths && selectedSubpaths.length > 0) {
      return {
        type: 'subpath',
        subpathInfo: selectedSubpaths[0],
      };
    }

    if (selectedIds.length === 1) {
      const elementMap = buildElementMap(elements);
      const element = elementMap.get(selectedIds[0]);
      if (element?.type === 'group') {
        return { type: 'group', groupId: selectedIds[0] };
      }
      if (element?.type === 'path') {
        return { type: 'path', elementId: selectedIds[0] };
      }
      return { type: 'element', elementId: selectedIds[0] };
    }

    if (selectedIds.length > 1) {
      return { type: 'multiselection', elementIds: selectedIds };
    }

    return { type: 'canvas' };
  }, [selectedCommands, selectedSubpaths, selectedIds]);
}
