import React from 'react';
import { Box, HStack, useColorModeValue } from '@chakra-ui/react';
import { Pin, PinOff } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import ConditionalTooltip from '../../ui/ConditionalTooltip';
import { SidebarUtilityButton } from '../../ui/SidebarUtilityButton';
import { useCanvasStore } from '../../store/canvasStore';
import { useResponsive } from '../../hooks';

export const LeftSidebarToolGrid: React.FC = () => {
  const { canPinSidebar } = useResponsive();
  const toolGridBorderColor = useColorModeValue('gray.600', 'whiteAlpha.700');

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

  const switchPanel = (nextPanel: 'structure' | 'library') => {
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

  const buttons = [
    {
      key: 'structure',
      element: (
        <SidebarUtilityButton
          label="Struct"
          icon={undefined}
          iconOnly={false}
          onClick={() => switchPanel('structure')}
          isActive={leftSidebarActivePanel === 'structure'}
          flex={0}
          fullWidth
          fontSize="sm"
          borderWidth="1px"
          inactiveBorderColor={toolGridBorderColor}
        />
      ),
    },
    {
      key: 'library',
      element: (
        <SidebarUtilityButton
          label="Lib"
          icon={undefined}
          iconOnly={false}
          onClick={() => switchPanel('library')}
          isActive={leftSidebarActivePanel === 'library'}
          flex={0}
          fullWidth
          fontSize="sm"
          borderWidth="1px"
          inactiveBorderColor={toolGridBorderColor}
        />
      ),
    },
  ];

  return (
    <Box
      bg="surface.panel"
      position="relative"
      pr="6px"
    >
      <HStack w="full" spacing={0} alignItems="stretch">
        <Box
          display="flex"
          alignItems="center"
        >
          <ConditionalTooltip label={isLeftSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}>
            <SidebarUtilityButton
              label={isLeftSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              icon={isLeftSidebarPinned ? PinOff : Pin}
              iconOnly
              fontSize="xs"
              borderless
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
        <Box flex={1} display="flex">
          <HStack spacing={2} w="full" justifyContent="space-between">
            {buttons.map((button) => (
              <Box
                key={button.key}
                flex="1"
                w="full"
                display="flex"
                justifyContent="center"
              >
                {button.element}
              </Box>
            ))}
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
};
