import React, { useState } from 'react';
import {
  Box,
  VStack,
  IconButton,
  Collapse,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { pluginManager } from '../utils/pluginManager';
import { useThemeColors, useSidebarLayout } from '../hooks';
import { useCanvasStore } from '../store/canvasStore';
import { zIndices } from '../theme/spacing';

/**
 * ExpandableToolPanel - Shows plugin-specific options in an expandable panel
 * Gets all state from store directly (no props drilling)
 */
export const ExpandableToolPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get effective sidebar width using consolidated hook
  const { effectiveSidebarWidth, effectiveLeftSidebarWidth, isSidebarPinned } = useSidebarLayout();

  // Get active plugin from store
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const isWithoutDistractionMode = useCanvasStore(
    (state) => Boolean(state.settings.withoutDistractionMode)
  );

  const { expandable: { bg, borderColor, iconColor, hoverBg } } = useThemeColors();
  const borderWidth = useColorModeValue('0px', '0px');
  const expandedBorderBottom = useColorModeValue('0px', '0px');

  const PanelComponent = activePlugin ? pluginManager.getExpandablePanel(activePlugin) : null;

  // The expandable panel only shows when the right sidebar is not pinned.
  if (!PanelComponent || isSidebarPinned) {
    return null;
  }

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const offset = (effectiveLeftSidebarWidth - effectiveSidebarWidth) / 2;
  const leftPosition = (effectiveSidebarWidth > 0 || effectiveLeftSidebarWidth > 0)
    ? `calc(50% + ${offset}px)`
    : '50%';
  const bottomPosition = isWithoutDistractionMode
    ? { base: isExpanded ? '12px' : '8px', md: isExpanded ? '16px' : '12px' }
    : { base: isExpanded ? '48px' : '44px', md: isExpanded ? '60px' : '56px' };

  return (
    <Box
      position="fixed"
      bottom={bottomPosition}
      left={leftPosition}
      transform="translateX(-50%)"
      zIndex={zIndices.expandableToolPanel}
      w={isExpanded ? "250px" : "auto"}
      maxW={isExpanded ? "250px" : { base: '90vw', md: '600px' }}
      minW={isExpanded ? "250px" : "auto"}
      transition="left 0.3s ease-in-out"
    >
      <VStack spacing={0} align="stretch">
        <Box
          bg={bg}
          borderRadius={isExpanded ? "12px 12px 0 0" : "full"}
          borderWidth={borderWidth}
          borderColor={borderColor}
          borderBottom={isExpanded ? expandedBorderBottom : "none"}
          display="flex"
          justifyContent="center"
          cursor="pointer"
          onClick={toggleExpand}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleExpand();
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse options" : "Expand options"}
          _hover={{ bg: hoverBg }}
          transition="background 0.2s"
        >
          <IconButton
            icon={isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            aria-label={isExpanded ? "Collapse options" : "Expand options"}
            size={isExpanded ? "xxs" : "xs"}
            variant="ghost"
            color={iconColor}
            _hover={{ bg: 'transparent' }}
            pointerEvents="none"
          />
        </Box>

        <Collapse in={isExpanded} animateOpacity>
          <Box
            bg={bg}
            borderWidth={borderWidth}
            borderColor={borderColor}
            borderTop="none"
            px={2}
            pb={2}
            boxShadow="0 -2px 8px rgba(0, 0, 0, 0.1)"
            w="250px"
            minW="250px"
            maxW="250px"
            overflow="hidden"
          >
            <PanelComponent />
          </Box>
        </Collapse>
      </VStack>
    </Box>
  );
};
