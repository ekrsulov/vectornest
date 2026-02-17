import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import {
  Combine,
  Layers,
  Minimize,
  Grid3x3,
  SplitSquareVertical,
  Scissors,
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import type { FloatingContextMenuAction } from '../../types/plugins';
import { PathOperationsPanel } from './PathOperationsPanel';
import { selectionHasOnlyPaths } from '../../utils/selectionGuards';

export const pathPlugin: PluginDefinition<CanvasStore> = {
  id: 'path',
  metadata: {
    label: 'Path Operations',
  },
  sidebarPanels: [
    {
      key: 'path-operations',
      condition: (ctx) => {
        if (ctx.isInSpecialPanelMode || ctx.activePlugin !== 'select') return false;

        const totalSelectedItems = ctx.selectedPathsCount + ctx.selectedSubpathsCount;

        // Show when there are at least two path-related items, or a single path with multiple subpaths
        return totalSelectedItems >= 2 || ctx.hasPathWithMultipleSubpaths;
      },
      component: PathOperationsPanel,
    },
  ],
  contextMenuActions: [
    {
      id: 'path-operations-menu',
      action: (context) => {
        if (context.type !== 'multiselection' || !context.elementIds) return null;

        const store = useCanvasStore.getState();
        if (!selectionHasOnlyPaths(context.elementIds, store.elements || [])) return null;
        const pathCount = context.elementIds.filter(id => {
          const el = store.elements.find(e => e.id === id);
          return el && el.type === 'path';
        }).length;

        if (pathCount < 2) return null;

        const pathOps: FloatingContextMenuAction[] = [];

        // Boolean operations for 2+ paths
        pathOps.push({ id: 'union', label: 'Union', icon: Combine, onClick: () => store.performPathUnion?.() });
        pathOps.push({ id: 'union-paperjs', label: 'Union (PaperJS)', icon: Layers, onClick: () => store.performPathUnionPaperJS?.() });

        // Binary operations for exactly 2 paths
        if (pathCount === 2) {
          pathOps.push({ id: 'subtract', label: 'Subtract', icon: Minimize, onClick: () => store.performPathSubtraction?.() });
          pathOps.push({ id: 'intersect', label: 'Intersect', icon: Grid3x3, onClick: () => store.performPathIntersect?.() });
          pathOps.push({ id: 'exclude', label: 'Exclude', icon: SplitSquareVertical, onClick: () => store.performPathExclude?.() });
          pathOps.push({ id: 'divide', label: 'Divide', icon: Scissors, onClick: () => store.performPathDivide?.() });
        }

        return {
          id: 'path-operations-menu',
          label: 'Path Operations',
          icon: Combine,
          submenu: pathOps,
        };
      },
    },
  ],
};
