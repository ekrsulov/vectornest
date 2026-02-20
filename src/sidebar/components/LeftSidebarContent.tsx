import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { LeftSidebarToolGrid } from './LeftSidebarToolGrid';
import { SvgStructurePanel } from '../../plugins/svgStructure/SvgStructurePanel';
import { LibraryRelatedPanels } from '../panels/LibraryRelatedPanels';
import { SidebarPanelScopeContext } from '../../contexts/sidebarPanelState';

export const LeftSidebarContent: React.FC = () => {
  const leftSidebarActivePanel = useCanvasStore((state) => state.leftSidebarActivePanel);
  const maximizedLeftSidebarPanelKey = useCanvasStore((state) => state.leftMaximizedSidebarPanelKey);

  const scrollbarTrack = useColorModeValue('#f1f1f1', 'rgba(255, 255, 255, 0.06)');
  const scrollbarThumb = useColorModeValue('#888', 'rgba(255, 255, 255, 0.3)');
  const scrollbarThumbHover = useColorModeValue('#555', 'rgba(255, 255, 255, 0.45)');

  return (
    <SidebarPanelScopeContext.Provider value="left">
      <Box bg="surface.panel" p={0} display="flex" flexDirection="column" flex="1" overflow="hidden" position="relative">
        {!maximizedLeftSidebarPanelKey && <LeftSidebarToolGrid />}

        <Box
        flex={1}
        px={2}
        pb={0}
        overflowY="auto"
        overflowX="hidden"
        display="flex"
        flexDirection="column"
        gap={0}
        bg="surface.panel"
        minH={0}
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: scrollbarTrack,
          },
          '&::-webkit-scrollbar-thumb': {
            background: scrollbarThumb,
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: scrollbarThumbHover,
          },
        }}
      >
        {leftSidebarActivePanel === 'structure' ? (
          <SvgStructurePanel panelKey="svgStructure:svg-structure-panel" />
        ) : leftSidebarActivePanel === 'library' ? (
          <LibraryRelatedPanels />
        ) : (
          <LibraryRelatedPanels
            targetPluginId="generatorLibrary"
            badgeComponentName="GeneratorLibraryPanelRelated"
          />
        )}
      </Box>
    </Box>
    </SidebarPanelScopeContext.Provider>
  );
};
