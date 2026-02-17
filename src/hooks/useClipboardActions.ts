import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import {
  Trash2,
  Copy,
  Clipboard,
} from 'lucide-react';
import { commandsToString } from '../utils/pathParserUtils';
import { logger } from '../utils';
import { duplicateElements } from '../utils/duplicationUtils';
import { buildElementMap } from '../utils';
import { elementContributionRegistry } from '../utils/elementContributionRegistry';
import type { FloatingContextMenuAction } from '../types/plugins';
import { type SelectionContextInfo, isPointSelectionType } from '../types/selection';
import type { PathData } from '../types';

/**
 * Hook that provides clipboard and deletion actions for the floating context menu.
 */
export function useClipboardActions(context: SelectionContextInfo | null): FloatingContextMenuAction[] {
  const {
    addElement,
    updateElement,
    deleteSelectedElements,
    deleteSelectedSubpaths,
  } = useCanvasStore(
    useShallow((state) => ({
      addElement: state.addElement,
      updateElement: state.updateElement,
      deleteSelectedElements: state.deleteSelectedElements,
      deleteSelectedSubpaths: state.deleteSelectedSubpaths,
    }))
  );

  // Duplicate action
  const handleDuplicate = useCallback(() => {
    if (!context) return;

    const elements = useCanvasStore.getState().elements;
    const elementMap = buildElementMap(elements);

    if (context.type === 'path' && context.elementId) {
      duplicateElements([context.elementId], elementMap, addElement, updateElement);
    } else if (context.type === 'group' && context.groupId) {
      duplicateElements([context.groupId], elementMap, addElement, updateElement);
    } else if (context.type === 'multiselection' && context.elementIds) {
      duplicateElements(context.elementIds, elementMap, addElement, updateElement);
    } else if (context.type === 'subpath' && context.subpathInfo) {
      const { elementId, subpathIndex } = context.subpathInfo;
      const element = elementMap.get(elementId);

      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        const subpath = pathData.subPaths[subpathIndex];

        if (subpath) {
          addElement({
            type: 'path',
            data: {
              ...pathData,
              subPaths: [subpath],
            },
          });
        }
      }
    } else if (context.type === 'element' && context.elementId) {
      duplicateElements([context.elementId], elementMap, addElement, updateElement);
    }
  }, [context, addElement, updateElement]);

  // Copy to clipboard action
  const handleCopyToClipboard = useCallback(async () => {
    if (!context) return;

    const elements = useCanvasStore.getState().elements;
    const elementMap = buildElementMap(elements);
    let commands = null;

    if (context.type === 'path' && context.elementId) {
      const element = elementMap.get(context.elementId);
      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        commands = pathData.subPaths.flat();
      }
    } else if (context.type === 'subpath' && context.subpathInfo) {
      const { elementId, subpathIndex } = context.subpathInfo;
      const element = elementMap.get(elementId);

      if (element && element.type === 'path') {
        const pathData = element.data as PathData;
        commands = pathData.subPaths[subpathIndex];
      }
    } else if (context.type === 'element' && context.elementId) {
      const element = elementMap.get(context.elementId);
      if (element) {
        const svg = elementContributionRegistry.serializeElement(element);
        if (!svg) return;
        try {
          await navigator.clipboard.writeText(svg);
          logger.info('Element copied to clipboard', svg);
        } catch (err) {
          logger.error('Failed to copy element to clipboard', err);
        }
      }
      return;
    }

    if (commands) {
      const pathData = commandsToString(commands);
      try {
        await navigator.clipboard.writeText(pathData);
        logger.info('Path copied to clipboard', pathData);
      } catch (err) {
        logger.error('Failed to copy path to clipboard', err);
      }
    }
  }, [context]);

  return useMemo(() => {
    if (!context) return [];

    const actions: FloatingContextMenuAction[] = [];

    // Add clipboard actions for appropriate contexts
    if (context.type === 'path' || context.type === 'group' ||
      context.type === 'multiselection' || context.type === 'subpath' || context.type === 'element') {
      actions.push({
        id: 'duplicate',
        label: 'Duplicate',
        icon: Copy,
        onClick: handleDuplicate,
      });

      // Only path and subpath can be copied to clipboard
      if (context.type === 'path' || context.type === 'subpath' || context.type === 'element') {
        actions.push({
          id: 'copy',
          label: 'Copy to Clipboard',
          icon: Clipboard,
          onClick: handleCopyToClipboard,
        });
      }
    }

    // Add delete action for all contexts except points (handled by plugin)
    if (!isPointSelectionType(context.type)) {

      const deleteAction: FloatingContextMenuAction = {
        id: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
      };

      if (context.type === 'subpath') {
        deleteAction.onClick = () => deleteSelectedSubpaths?.();
      } else {
        deleteAction.onClick = () => deleteSelectedElements();
      }

      actions.push(deleteAction);
    }

    return actions;
  }, [
    context,
    handleDuplicate,
    handleCopyToClipboard,
    deleteSelectedSubpaths,
    deleteSelectedElements,
  ]);
}
