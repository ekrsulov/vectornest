import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { ArrowBigUp } from 'lucide-react';
import { useCanvasStore } from '../store/canvasStore';
import { RenderCountBadgeWrapper } from './RenderCountBadgeWrapper';
import { useThemeColors, useSidebarLayout, useResponsive } from '../hooks';

/**
 * VirtualShiftButton - Mobile-only button for virtual shift key
 * Gets all state from store directly (no props drilling)
 */
export const VirtualShiftButton: React.FC = () => {
  // Get effective sidebar width using consolidated hook
  const { effectiveSidebarWidth, isSidebarPinned } = useSidebarLayout();

  // Get virtual shift state from store
  const isVirtualShiftActive = useCanvasStore(state => state.isVirtualShiftActive);
  const toggleVirtualShift = useCanvasStore(state => state.toggleVirtualShift);

  const { isMobile } = useResponsive();

  // Use unified theme colors
  const { toggle } = useThemeColors();
  const { active: { bg: activeBg, color: activeColor, hoverBg: activeHoverBg }, inactive: { hoverBg: inactiveHoverBg } } = toggle;
  const inactiveBg = 'rgba(255, 255, 255, 0.95)';
  const inactiveBgDark = 'rgba(26, 32, 44, 0.95)';

  // Only show on mobile devices
  if (!isMobile) {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom={{ base: 2, md: 3 }}
      right={isSidebarPinned ? `${effectiveSidebarWidth + 20}px` : "20px"}
      zIndex={999}
    >
      <IconButton
        aria-label="Toggle Virtual Shift"
        icon={<ArrowBigUp size={18} />}
        onClick={toggleVirtualShift}
        bg={isVirtualShiftActive ? activeBg : inactiveBg}
        color={isVirtualShiftActive ? activeColor : undefined}
        _hover={{ bg: isVirtualShiftActive ? activeHoverBg : inactiveHoverBg }}
        variant="solid"
        size="sm"
        borderRadius="full"
        boxShadow="none"
        borderWidth="0px"
        borderColor="transparent"
        _dark={{ bg: isVirtualShiftActive ? activeBg : inactiveBgDark, borderWidth: '0px', borderColor: 'transparent' }}
        sx={{
          width: '36px',
          height: '36px',
          minWidth: '36px',
          minHeight: '36px',
          backdropFilter: 'blur(10px)',
          backgroundColor: isVirtualShiftActive ? activeBg : inactiveBg,
          _hover: {
            backgroundColor: isVirtualShiftActive ? activeHoverBg : inactiveHoverBg,
            transform: 'translateY(-1px)',
          },
          _active: {
            transform: 'translateY(0px)',
          },
          transition: 'all 0.15s ease',
        }}
      />
      <RenderCountBadgeWrapper componentName="VirtualShiftButton" position="top-right" />
    </Box>
  );
};
