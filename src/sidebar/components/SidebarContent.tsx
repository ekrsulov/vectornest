import React from 'react';
import { Box } from '@chakra-ui/react';
import { SidebarToolGrid } from './SidebarToolGrid';
import { SidebarPanels } from './SidebarPanels';
import { SidebarFooter } from './SidebarFooter';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { useCanvasStore } from '../../store/canvasStore';

// Plugins whose panel replaces the footer (Editor + Arrange), similar to File/Settings/Library
const FOOTER_HIDING_PLUGINS = new Set(['generatorLibrary', 'auditLibrary', 'svgStructure']);

export const SidebarContent: React.FC = () => {
  const { activePlugin, showFilePanel, showSettingsPanel, showLibraryPanel } = useSidebarContext();
  const maximizedSidebarPanelKey = useCanvasStore(state => state.maximizedSidebarPanelKey);

  const isSpecialPanelOpen = showFilePanel || showSettingsPanel || showLibraryPanel || FOOTER_HIDING_PLUGINS.has(activePlugin ?? '');

  return (
    <Box bg="surface.panel" p={0} display="flex" flexDirection="column" flex="1" overflow="hidden" position="relative">
      <RenderCountBadgeWrapper componentName="Sidebar" position="top-right" />

      {!maximizedSidebarPanelKey && <SidebarToolGrid />}

      <SidebarPanels />

      {!maximizedSidebarPanelKey && !isSpecialPanelOpen && <SidebarFooter />}
    </Box>
  );
};
