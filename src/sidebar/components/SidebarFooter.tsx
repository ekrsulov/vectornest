import React from 'react';
import { Box, Flex, IconButton } from '@chakra-ui/react';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { ArrangePanel } from '../panels/ArrangePanel';
import { EditorPanel } from '../panels/EditorPanel';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useSidebarFooterHeight } from '../../hooks/useSidebarFooterHeight';
import { useSidebarContext } from '../../contexts/SidebarContext';

/**
 * Fixed footer section of the sidebar containing the ArrangePanel.
 * Gets expand state from SidebarContext.
 */
export const SidebarFooter: React.FC = () => {
  const { isArrangeExpanded, setIsArrangeExpanded } = useSidebarContext();
  
  // Use shared hook for managing footer height CSS variable
  const footerRef = useSidebarFooterHeight();

  // Subscribe to individual selection state to avoid unnecessary re-renders
  const hasSelectedIds = useCanvasStore(state => state.selectedIds.length > 0);
  const hasSelectedCommands = useCanvasStore(state => (state.selectedCommands?.length ?? 0) > 0);
  const hasSelectedSubpaths = useCanvasStore(state => (state.selectedSubpaths?.length ?? 0) > 0);
  
  const hasSelection = hasSelectedIds || hasSelectedCommands || hasSelectedSubpaths;

  return (
    <Box
      ref={footerRef}
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      bg="surface.panel"
      zIndex={1001}
      display="flex"
      flexDirection="column"
      pt={0}
      pb={0}
    >
      {hasSelection && isArrangeExpanded && <ArrangePanel />}

      {hasSelection && (
        <Flex position="relative" align="center">
          <ConditionalTooltip label={isArrangeExpanded ? "Collapse Arrange" : "Expand Arrange"}>
            <IconButton
              aria-label={isArrangeExpanded ? "Collapse Arrange" : "Expand Arrange"}
              icon={isArrangeExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              onClick={() => setIsArrangeExpanded(!isArrangeExpanded)}
              size="xs"
              variant="outline"
              borderRadius="full"
              position="absolute"
              left="50%"
              bottom="-6px"
              transform="translateX(-50%)"
              minW="24px"
              h="24px"
            />
          </ConditionalTooltip>
        </Flex>
      )}

      <Box px={2}>
        <EditorPanel />
      </Box>

    </Box>
  );
};
