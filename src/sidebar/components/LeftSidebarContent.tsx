import React, { Suspense } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { useCanvasStore } from '../../store/canvasStore';
import { LeftSidebarToolGrid } from './LeftSidebarToolGrid';
import { LibraryRelatedPanels } from '../panels/LibraryRelatedPanels';
import { SidebarPanelScopeContext } from '../../contexts/sidebarPanelState';
import { panelRegistry } from '../../utils/panelRegistry';
import { usePluginRegistrationVersion } from '../../hooks/usePluginRegistrationVersion';

export const LeftSidebarContent: React.FC = () => {
  const registrationVersion = usePluginRegistrationVersion();
  const leftSidebarActivePanel = useCanvasStore((state) => state.leftSidebarActivePanel);
  const maximizedLeftSidebarPanelKey = useCanvasStore((state) => state.leftMaximizedSidebarPanelKey);
  const StructurePanel = panelRegistry.get('svgStructure:svgStructure')?.component;
  void registrationVersion;

  const scrollbarTrack = useColorModeValue('#f1f1f1', 'rgba(255, 255, 255, 0.06)');
  const scrollbarThumb = useColorModeValue('#888', 'rgba(255, 255, 255, 0.3)');
  const scrollbarThumbHover = useColorModeValue('#555', 'rgba(255, 255, 255, 0.45)');
  const panelContent = leftSidebarActivePanel === 'structure'
    ? (StructurePanel ? (
      <Suspense fallback={<Box py={4} />}>
        <StructurePanel panelKey="svgStructure:svg-structure-panel" />
      </Suspense>
    ) : null)
    : leftSidebarActivePanel === 'library'
      ? <LibraryRelatedPanels />
      : leftSidebarActivePanel === 'animLibrary'
        ? (
          <LibraryRelatedPanels
            targetPluginId="animLibrary"
            badgeComponentName="AnimLibraryPanelRelated"
          />
        )
        : (
          <LibraryRelatedPanels
            targetPluginId="generatorLibrary"
            badgeComponentName="GeneratorLibraryPanelRelated"
          />
        );

  return (
    <SidebarPanelScopeContext.Provider value="left">
      <Box bg="surface.panel" p={0} display="flex" flexDirection="column" flex="1" overflow="hidden" position="relative">
        {!maximizedLeftSidebarPanelKey && <LeftSidebarToolGrid />}

        <Box
          data-sidebar-scroll-area="true"
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
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': {
              width: '0px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'transparent',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'transparent',
            },
            '[data-sidebar-shell="true"]:hover &': {
              scrollbarWidth: 'thin',
              scrollbarColor: `${scrollbarThumb} ${scrollbarTrack}`,
            },
            '[data-sidebar-shell="true"]:hover &::-webkit-scrollbar': {
              width: '8px',
            },
            '[data-sidebar-shell="true"]:hover &::-webkit-scrollbar-track': {
              background: scrollbarTrack,
            },
            '[data-sidebar-shell="true"]:hover &::-webkit-scrollbar-thumb': {
              background: scrollbarThumb,
            },
            '[data-sidebar-shell="true"]:hover &::-webkit-scrollbar-thumb:hover': {
              background: scrollbarThumbHover,
            },
          }}
        >
          {panelContent}
        </Box>
      </Box>
    </SidebarPanelScopeContext.Provider>
  );
};
