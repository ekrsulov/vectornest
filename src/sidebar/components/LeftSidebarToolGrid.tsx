import React from 'react';
import { Box, HStack } from '@chakra-ui/react';
import { Clapperboard, FolderTree, LayoutGrid, LibraryBig, Pin, PinOff } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { SidebarTabStrip, type SidebarTabStripItem } from '../../ui/SidebarTabStrip';
import { useCanvasStore } from '../../store/canvasStore';
import { useResponsive } from '../../hooks/useResponsive';

export const LeftSidebarToolGrid: React.FC = () => {
  const { canPinSidebar } = useResponsive();

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
      key: 'pin',
      label: isLeftSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar',
      tooltip: isLeftSidebarPinned ? 'Unpin sidebar' : 'Pin sidebar',
      icon: isLeftSidebarPinned ? PinOff : Pin,
      iconOnly: true,
      isActive: false,
      onClick: () => {
        if (!canPinSidebar) return;
        setIsLeftSidebarPinned(!isLeftSidebarPinned);
      },
    },
    {
      key: 'structure',
      label: 'Structure',
      tooltip: 'Structure',
      icon: FolderTree,
      iconOnly: true,
      isActive: leftSidebarActivePanel === 'structure',
      onClick: () => switchPanel('structure'),
    },
    {
      key: 'library',
      label: 'Library',
      tooltip: 'Library',
      icon: LibraryBig,
      iconOnly: true,
      isActive: leftSidebarActivePanel === 'library',
      onClick: () => switchPanel('library'),
    },
    {
      key: 'generatorLibrary',
      label: 'Generator Library',
      tooltip: 'Generators',
      icon: LayoutGrid,
      iconOnly: true,
      isActive: leftSidebarActivePanel === 'generatorLibrary',
      onClick: () => switchPanel('generatorLibrary'),
    },
    {
      key: 'animLibrary',
      label: 'Animation Library',
      tooltip: 'Animation',
      icon: Clapperboard,
      iconOnly: true,
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
      <HStack
        w="full"
        spacing={0}
        minH="34px"
        alignItems="center"
        px={1.5}
        py={1}
      >
        <Box flex={1} display="flex" minW={0}>
          <SidebarTabStrip items={buttons} variant="iconRail" distribution="space-between" />
        </Box>
      </HStack>
    </Box>
  );
};
