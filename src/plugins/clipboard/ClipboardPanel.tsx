/**
 * Clipboard Panel
 * Displays clipboard actions and status in the sidebar
 * Follows the plugin-panel-style guide
 */

import React, { useCallback, useEffect, useState } from 'react';
import { VStack, HStack, Text, Badge } from '@chakra-ui/react';
import { Copy, Scissors, ClipboardPaste, ClipboardCheck, RefreshCw } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { Panel } from '../../ui/Panel';
import { PanelActionButton } from '../../ui/PanelActionButton';
import type { ClipboardSlice } from './slice';
import { copySelectedElements, cutSelectedElements, pasteFromClipboard } from './actions';
import type { CanvasStore } from '../../store/canvasStore';

interface ClipboardPanelProps {
  hideTitle?: boolean;
}

export const ClipboardPanel: React.FC<ClipboardPanelProps> = ({ hideTitle = false }) => {
  // Individual selectors to prevent unnecessary re-renders
  const clipboardState = useCanvasStore(state => (state as unknown as ClipboardSlice).clipboard);
  const updateClipboardState = useCanvasStore(state => (state as unknown as ClipboardSlice).updateClipboardState);
  const selectedCount = useCanvasStore(state => state.selectedIds.length);
  
  const [hasClipboardContent, setHasClipboardContent] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check clipboard content on mount and periodically
  const checkClipboard = useCallback(async () => {
    setIsChecking(true);
    try {
      // Check for internal data first
      const internalData = localStorage.getItem('application/vnd.vectornest.selection+json');
      if (internalData) {
        setHasClipboardContent(true);
        setIsChecking(false);
        return;
      }

      // Check system clipboard
      const items = await navigator.clipboard.read();
      const hasContent = items.some(item => 
        item.types.includes('image/svg+xml') ||
        item.types.includes('text/html') ||
        item.types.includes('text/plain') ||
        item.types.includes('image/png')
      );
      setHasClipboardContent(hasContent);
    } catch {
      // Clipboard API might not be available or permission denied
      setHasClipboardContent(false);
    }
    setIsChecking(false);
  }, []);

  useEffect(() => {
    checkClipboard();
    
    // Check clipboard when window regains focus
    const handleFocus = () => checkClipboard();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkClipboard]);

  // Get store for actions
  const handleCopy = useCallback(async () => {
    const store = useCanvasStore.getState() as CanvasStore & ClipboardSlice;
    await copySelectedElements(store);
    checkClipboard();
  }, [checkClipboard]);

  const handleCut = useCallback(async () => {
    const store = useCanvasStore.getState() as CanvasStore & ClipboardSlice;
    await cutSelectedElements(store);
    checkClipboard();
  }, [checkClipboard]);

  const handlePaste = useCallback(async () => {
    const store = useCanvasStore.getState() as CanvasStore & ClipboardSlice;
    await pasteFromClipboard(store, false);
  }, []);

  const handlePasteInPlace = useCallback(async () => {
    const store = useCanvasStore.getState() as CanvasStore & ClipboardSlice;
    await pasteFromClipboard(store, true);
  }, []);

  const handleResetPasteCount = useCallback(() => {
    updateClipboardState?.({
      pasteCount: 0,
      lastPastePosition: null,
    });
  }, [updateClipboardState]);

  const canCopy = selectedCount > 0;
  const canPaste = hasClipboardContent || clipboardState?.hasInternalData;

  return (
    <Panel
      title="Clipboard"
      hideHeader={hideTitle}
      isCollapsible
      defaultOpen={false}
      headerActions={
        <HStack spacing={1}>
          <PanelActionButton
            icon={Copy}
            iconSize={14}
            label="Copy (⌘C)"
            onClick={handleCopy}
            isDisabled={!canCopy}
          />
          <PanelActionButton
            icon={Scissors}
            iconSize={14}
            label="Cut (⌘X)"
            onClick={handleCut}
            isDisabled={!canCopy}
          />
          <PanelActionButton
            icon={ClipboardPaste}
            iconSize={14}
            label="Paste (⌘V)"
            onClick={handlePaste}
            isDisabled={!canPaste}
          />
          <PanelActionButton
            icon={ClipboardCheck}
            iconSize={14}
            label="In Place (⌘⇧V)"
            onClick={handlePasteInPlace}
            isDisabled={!canPaste}
          />
        </HStack>
      }
    >
      <VStack spacing={2} align="stretch">
        {/* Status */}
        <HStack spacing={2} align="center">
          <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
            Status:
          </Text>
          {clipboardState?.hasInternalData ? (
            <Badge colorScheme="green" fontSize="10px">
              VectorNest data ready
            </Badge>
          ) : hasClipboardContent ? (
            <Badge colorScheme="blue" fontSize="10px">
              External content
            </Badge>
          ) : (
            <Badge colorScheme="gray" fontSize="10px">
              Empty
            </Badge>
          )}
          <PanelActionButton
            icon={RefreshCw}
            iconSize={12}
            label="Check"
            onClick={checkClipboard}
            isDisabled={isChecking}
          />
        </HStack>

        {/* Paste Count (for cascading offset) */}
        {(clipboardState?.pasteCount ?? 0) > 0 && (
          <HStack spacing={2} align="center">
            <Text fontSize="12px" color="gray.600" _dark={{ color: 'gray.400' }}>
              Paste offset: {(clipboardState?.pasteCount ?? 0) * 10}px
            </Text>
            <PanelActionButton
              icon={RefreshCw}
              iconSize={12}
              label="Reset"
              onClick={handleResetPasteCount}
            />
          </HStack>
        )}

        {/* Status Message */}
        {clipboardState?.statusMessage && (
          <Text fontSize="11px" color="blue.500" _dark={{ color: 'blue.300' }}>
            {clipboardState.statusMessage}
          </Text>
        )}

        {/* Selection Info */}
        <Text fontSize="11px" color="gray.500" _dark={{ color: 'gray.500' }}>
          {selectedCount === 0 
            ? 'Select elements to copy or cut'
            : `${selectedCount} element${selectedCount > 1 ? 's' : ''} selected`}
        </Text>

        {/* Keyboard Shortcuts Info */}
        <VStack spacing={0.5} align="stretch" pt={1}>
          <Text fontSize="10px" color="gray.500" fontWeight="semibold">
            Shortcuts:
          </Text>
          <HStack spacing={2}>
            <Text fontSize="10px" color="gray.500">⌘C Copy</Text>
            <Text fontSize="10px" color="gray.500">⌘X Cut</Text>
            <Text fontSize="10px" color="gray.500">⌘V Paste</Text>
            <Text fontSize="10px" color="gray.500">⌘⇧V In Place</Text>
          </HStack>
        </VStack>
      </VStack>
    </Panel>
  );
};
