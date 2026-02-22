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
import { useThemeColors, useSidebarLayout, useResponsive } from '../hooks';
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
  const { isMobile } = useResponsive();

  // Get active plugin from store
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const isWithoutDistractionMode = useCanvasStore(
    (state) => Boolean(state.settings.withoutDistractionMode)
  );

  const {
    expandable: { bg, borderColor, iconColor, hoverBg },
    toggle: { inactive: { hoverBg: inactiveHoverBg, color: inactiveColor } },
  } = useThemeColors();
  const borderWidth = useColorModeValue('0px', '0px');
  const expandedBorderBottom = useColorModeValue('0px', '0px');
  const inactiveBg = 'rgba(255, 255, 255, 0.95)';
  const inactiveBgDark = 'rgba(26, 32, 44, 0.95)';

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
  const useReducedButtonStyle = isWithoutDistractionMode && isMobile && !isExpanded;
  const bottomPosition = isWithoutDistractionMode
    ? (
      useReducedButtonStyle
        // Match VirtualShiftButton exactly in reduced mobile mode.
        ? { base: 2, md: 3 }
        : { base: isExpanded ? '12px' : '8px', md: isExpanded ? '16px' : '12px' }
    )
    : { base: isExpanded ? '48px' : '44px', md: isExpanded ? '60px' : '56px' };

  return (
    <Box
      position="fixed"
      bottom={bottomPosition}
      left={leftPosition}
      transform="translateX(-50%)"
      zIndex={zIndices.expandableToolPanel}
      w={isExpanded ? '250px' : 'auto'}
      maxW={isExpanded ? '250px' : { base: '90vw', md: '600px' }}
      minW={isExpanded ? '250px' : 'auto'}
      transition="left 0.3s ease-in-out"
    >
      <VStack spacing={0} align="stretch">
        <Box
          bg={useReducedButtonStyle ? inactiveBg : bg}
          borderRadius={isExpanded ? '12px 12px 0 0' : 'full'}
          borderWidth={borderWidth}
          borderColor={useReducedButtonStyle ? 'transparent' : borderColor}
          borderBottom={isExpanded ? expandedBorderBottom : 'none'}
          display="flex"
          justifyContent="center"
          alignItems="center"
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
          aria-label={isExpanded ? 'Collapse options' : 'Expand options'}
          _hover={useReducedButtonStyle ? { bg: inactiveHoverBg } : { bg: hoverBg }}
          _active={useReducedButtonStyle ? { transform: 'translateY(0px)' } : undefined}
          transition="all 0.15s ease"
          boxShadow="none"
          _dark={useReducedButtonStyle ? { bg: inactiveBgDark, borderColor: 'transparent' } : undefined}
          sx={useReducedButtonStyle ? {
            width: '32px',
            height: '32px',
            minWidth: '32px',
            minHeight: '32px',
            backdropFilter: 'blur(10px)',
            backgroundColor: inactiveBg,
            _hover: {
              backgroundColor: inactiveHoverBg,
              transform: 'translateY(-1px)',
            },
          } : undefined}
        >
          <IconButton
            icon={isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={useReducedButtonStyle ? 20 : 16} />}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            aria-label={isExpanded ? "Collapse options" : "Expand options"}
            size={useReducedButtonStyle ? 'sm' : (isExpanded ? 'xxs' : 'xs')}
            variant="ghost"
            color={useReducedButtonStyle ? inactiveColor : iconColor}
            _dark={useReducedButtonStyle ? { color: inactiveColor } : undefined}
            _hover={{ bg: 'transparent' }}
            pointerEvents="none"
            sx={useReducedButtonStyle ? {
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              p: 0,
              m: 0,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            } : undefined}
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
