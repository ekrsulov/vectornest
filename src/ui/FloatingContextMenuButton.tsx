import React, { useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Box, Popover, PopoverTrigger, PopoverContent } from '@chakra-ui/react';
import { MoreVertical, Square } from 'lucide-react';
import { ToolbarIconButton } from './ToolbarIconButton';
import type { CanvasStore } from '../store/canvasStore';
import { FloatingContextMenu } from './FloatingContextMenu';
import { useFloatingContextMenuActions } from '../hooks/useFloatingContextMenuActions';
import { useSelectionContext, NO_FOCUS_STYLES_DEEP } from '../hooks';
import { useCanvasStore } from '../store/canvasStore';
import { pluginManager } from '../utils/pluginManager';

/**
 * Floating Context Menu Button
 * 
 * Button in the bottom action bar that opens a context menu with actions
 * for the currently selected element(s). Replaces the delete button when
 * elements are selected.
 */
export const FloatingContextMenuButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Get selection state - combined into a single subscription
  const { selectedIds, selectedCommands, selectedSubpaths } = useCanvasStore(
    useShallow(state => ({
      selectedIds: state.selectedIds,
      selectedCommands: state.selectedCommands,
      selectedSubpaths: state.selectedSubpaths,
    }))
  );

  // Get animation state for conditional playback control button
  const { isPlaying, stopAnimations } = useCanvasStore(
    useShallow(state => ({
      isPlaying: (state as CanvasStore & { animationState?: { isPlaying?: boolean } }).animationState?.isPlaying,
      stopAnimations: (state as CanvasStore & { stopAnimations?: () => void }).stopAnimations,
    }))
  );

  // Get selection mode from the active plugin's behavior flags
  const selectionMode = pluginManager.getActiveSelectionMode();

  // Use centralized selection context hook
  const context = useSelectionContext();

  // Get actions based on selection context
  const actions = useFloatingContextMenuActions(context);

  const isEnabled = actions.length > 0;

  // Count selected items for badge - depends on active plugin's selection mode
  const selectionCount = useMemo(() => {
    if (selectionMode === 'subpaths' && selectedSubpaths && selectedSubpaths.length > 0) {
      return selectedSubpaths.length;
    }
    if (selectionMode === 'commands' && selectedCommands && selectedCommands.length > 0) {
      return selectedCommands.length;
    }
    return selectedIds.length;
  }, [selectionMode, selectedIds, selectedCommands, selectedSubpaths]);

  const handleActionClick = (actionFn?: () => void) => {
    if (actionFn) {
      actionFn();
    }
    setIsOpen(false);
  };

  // Wrap action onClick to close menu after execution
  // Only wrap actions with onClick, preserve submenu actions
  const wrappedActions = actions.map(action => ({
    ...action,
    onClick: action.onClick ? () => handleActionClick(action.onClick) : undefined,
    submenu: action.submenu?.map(subAction => ({
      ...subAction,
      onClick: subAction.onClick ? () => handleActionClick(subAction.onClick) : undefined,
    })),
  }));

  if (isPlaying) {
    return (
      <ToolbarIconButton
        icon={Square}
        label="Stop Animations"
        onClick={() => stopAnimations?.()}
      />
    );
  }

  return (
    <Popover
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="top-end"
      closeOnBlur={true}
      closeOnEsc={true}
    >
      <PopoverTrigger>
        <Box>
          <ToolbarIconButton
            icon={MoreVertical}
            label="Actions"
            onClick={() => setIsOpen(!isOpen)}
            isDisabled={!isEnabled}
            counter={selectionCount > 0 ? selectionCount : undefined}
          />
        </Box>
      </PopoverTrigger>
      <PopoverContent
        width="auto"
        border="none"
        boxShadow="none"
        bg="transparent"
        _focus={{ outline: 'none', boxShadow: 'none' }}
        _focusVisible={{ outline: 'none', boxShadow: 'none' }}
        sx={{
          ...NO_FOCUS_STYLES_DEEP,
          '& > *': { outline: 'none !important' },
        }}
      >
        <FloatingContextMenu
          actions={wrappedActions}
          isOpen={isOpen}
        />
      </PopoverContent>
    </Popover>
  );
};
