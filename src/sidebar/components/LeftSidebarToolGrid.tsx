import React from 'react';
import { Box, HStack, useColorModeValue } from '@chakra-ui/react';
import { Pin, PinOff } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { SidebarUtilityButton } from '../../ui/SidebarUtilityButton';
import { SidebarTabStrip, type SidebarTabStripItem } from '../../ui/SidebarTabStrip';
import { useCanvasStore } from '../../store/canvasStore';
import { useResponsive } from '../../hooks/useResponsive';

export const LeftSidebarToolGrid: React.FC = () => {
  const { canPinSidebar } = useResponsive();
  const pinBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100');
  const pinBorderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.200');

  const {
    leftSidebarActivePanel,
    isLeftSidebarPinned,
    setIsLeftSidebarPinned,
    setIsLeftSidebarOpen,
    setLeftSidebarActivePanel,
    setLeftOpenSidebarPanelKey,
    setLeftMaximizedSidebarPanelKey,
    saveCurrentLeftLibraryState,
    restoreLeftLibraryState,
  } = useCanvasStore(
    useShallow((state) => ({
      leftSidebarActivePanel: state.leftSidebarActivePanel,
      isLeftSidebarPinned: state.isLeftSidebarPinned,
      setIsLeftSidebarPinned: state.setIsLeftSidebarPinned,
      setIsLeftSidebarOpen: state.setIsLeftSidebarOpen,
      setLeftSidebarActivePanel: state.setLeftSidebarActivePanel,
      setLeftOpenSidebarPanelKey: state.setLeftOpenSidebarPanelKey,
      setLeftMaximizedSidebarPanelKey: state.setLeftMaximizedSidebarPanelKey,
      saveCurrentLeftLibraryState: state.saveCurrentLeftLibraryState,
      restoreLeftLibraryState: state.restoreLeftLibraryState,
    }))
  );

  const switchPanel = (nextPanel: 'structure' | 'library' | 'generatorLibrary' | 'animLibrary') => {
    if (leftSidebarActivePanel === 'library' && nextPanel !== 'library') {
      saveCurrentLeftLibraryState();
    }

    setLeftMaximizedSidebarPanelKey(null);
    setLeftSidebarActivePanel(nextPanel);
    setIsLeftSidebarOpen(true);

    if (nextPanel === 'library') {
      restoreLeftLibraryState();
    } else {
      setLeftOpenSidebarPanelKey(null);
    }
  };

  const buttons: SidebarTabStripItem[] = [
    {
      key: 'structure',
      label: 'Struct',
      isActive: leftSidebarActivePanel === 'structure',
      onClick: () => switchPanel('structure'),
    },
    {
      key: 'library',
      label: 'Lib',
      isActive: leftSidebarActivePanel === 'library',
      onClick: () => switchPanel('library'),
    },
    {
      key: 'generatorLibrary',
      label: 'Gen',
      isActive: leftSidebarActivePanel === 'generatorLibrary',
      onClick: () => switchPanel('generatorLibrary'),
    },
    {
      key: 'animLibrary',
      label: 'Anim',
      isActive: leftSidebarActivePanel === 'animLibrary',
      onClick: () => switchPanel('animLibrary'),
    },
  ];

  return (
    <Box
      bg="surface.panel"
      position="relative"
      pl={0}
      pr={0}
      pt={0}
    >
      <HStack w="full" spacing={1} alignItems="stretch">
        <Box
          display="flex"
          alignItems="center"
          h="28px"
        >
          <ConditionalTooltip label={isLeftSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}>
            <SidebarUtilityButton
              label={isLeftSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              icon={isLeftSidebarPinned ? PinOff : Pin}
              iconOnly
              fontSize="xs"
              inactiveBg={pinBg}
              inactiveBorderColor={pinBorderColor}
              onClick={() => {
                if (!canPinSidebar) return;
                setIsLeftSidebarPinned(!isLeftSidebarPinned);
              }}
              isActive={false}
              isDisabled={!canPinSidebar}
              flex={0}
              fullWidth={false}
            />
          </ConditionalTooltip>
        </Box>
        <Box flex={1} display="flex" minW={0}>
          <SidebarTabStrip items={buttons} flat />
        </Box>
      </HStack>
    </Box>
  );
};
