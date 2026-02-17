import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import {
  AlignLeft,
  AlignRight,
  AlignCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  UnfoldHorizontal,
  UnfoldVertical,
  FoldHorizontal,
  FoldVertical,
  ArrowLeftRight,
  ArrowUpDown,
  Triangle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useArrangeHandlers } from './useArrangeHandlers';
import type { FloatingContextMenuAction } from '../types/plugins';
import { type SelectionContextInfo, isPointSelectionType } from '../types/selection';

/**
 * Hook that provides alignment, distribution, and ordering actions
 * for the floating context menu.
 */
export function useAlignmentActions(context: SelectionContextInfo | null): FloatingContextMenuAction[] {
  const { selectedIds, selectedSubpaths, selectedCommands } = useCanvasStore(
    useShallow((state) => ({
      selectedIds: state.selectedIds,
      selectedSubpaths: state.selectedSubpaths,
      selectedCommands: state.selectedCommands,
    }))
  );
  const arrangeHandlers = useArrangeHandlers();

  return useMemo((): FloatingContextMenuAction[] => {
    if (!context) return [];

    // Determine count based on context type
    let count = 0;
    if (context?.type === 'subpath') {
      count = selectedSubpaths?.length ?? 0;
    } else if (isPointSelectionType(context?.type)) {
      count = selectedCommands?.length ?? 0;
    } else {
      count = selectedIds.length;
    }

    const canAlign = count >= 2;
    const canDistribute = count >= 3;
    const isPointContext = isPointSelectionType(context?.type);

    const actions: FloatingContextMenuAction[] = [];

    if (canAlign) {
      // Alignment submenu
      const alignActions: FloatingContextMenuAction[] = [
        { id: 'align-left', label: 'Align Left', icon: AlignLeft, onClick: arrangeHandlers.alignLeft },
        { id: 'align-center', label: 'Align Center', icon: AlignCenter, onClick: arrangeHandlers.alignCenter },
        { id: 'align-right', label: 'Align Right', icon: AlignRight, onClick: arrangeHandlers.alignRight },
        { id: 'align-top', label: 'Align Top', icon: AlignVerticalJustifyStart, onClick: arrangeHandlers.alignTop },
        { id: 'align-middle', label: 'Align Middle', icon: AlignVerticalJustifyCenter, onClick: arrangeHandlers.alignMiddle },
        { id: 'align-bottom', label: 'Align Bottom', icon: AlignVerticalJustifyEnd, onClick: arrangeHandlers.alignBottom }
      ];

      actions.push({
        id: 'align-menu',
        label: 'Align',
        icon: AlignCenter,
        submenu: alignActions
      });

      // Match size submenu (only for elements and subpaths, not for commands/points)
      if (!isPointContext) {
        const matchActions: FloatingContextMenuAction[] = [
          { id: 'match-width-largest', label: 'Width (Largest)', icon: UnfoldHorizontal, onClick: arrangeHandlers.matchWidthToLargest },
          { id: 'match-height-largest', label: 'Height (Largest)', icon: UnfoldVertical, onClick: arrangeHandlers.matchHeightToLargest },
          { id: 'match-width-smallest', label: 'Width (Smallest)', icon: FoldHorizontal, onClick: arrangeHandlers.matchWidthToSmallest },
          { id: 'match-height-smallest', label: 'Height (Smallest)', icon: FoldVertical, onClick: arrangeHandlers.matchHeightToSmallest }
        ];

        actions.push({
          id: 'match-menu',
          label: 'Match',
          icon: UnfoldHorizontal,
          submenu: matchActions
        });
      }
    }

    if (canDistribute) {
      // Distribution submenu
      const distributeActions: FloatingContextMenuAction[] = [
        { id: 'distribute-h', label: 'Horizontally', icon: ArrowLeftRight, onClick: arrangeHandlers.distributeHorizontally },
        { id: 'distribute-v', label: 'Vertically', icon: ArrowUpDown, onClick: arrangeHandlers.distributeVertically }
      ];

      actions.push({
        id: 'distribute-menu',
        label: 'Distribute',
        icon: ArrowLeftRight,
        submenu: distributeActions
      });
    }

    // Order submenu (only for elements and subpaths, not for commands)
    if (count > 0 && !isPointContext) {
      const orderActions: FloatingContextMenuAction[] = [
        { id: 'bring-front', label: 'Bring to Front', icon: Triangle, onClick: arrangeHandlers.bringToFront },
        { id: 'send-forward', label: 'Send Forward', icon: ChevronUp, onClick: arrangeHandlers.sendForward },
        { id: 'send-backward', label: 'Send Backward', icon: ChevronDown, onClick: arrangeHandlers.sendBackward },
        { id: 'send-back', label: 'Send to Back', icon: Triangle, onClick: arrangeHandlers.sendToBack }
      ];

      actions.push({
        id: 'order-menu',
        label: 'Order',
        icon: Triangle,
        submenu: orderActions
      });
    }

    return actions;
  }, [selectedIds, selectedSubpaths, selectedCommands, arrangeHandlers, context]);
}
