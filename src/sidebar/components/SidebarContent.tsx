import React from 'react';
import { Box } from '@chakra-ui/react';
import { SidebarToolGrid } from './SidebarToolGrid';
import { SidebarPanels } from './SidebarPanels';
import { SidebarFooter } from './SidebarFooter';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { useSidebarContext } from '../../contexts/SidebarContext';
import { useCanvasStore } from '../../store/canvasStore';

export const SidebarContent: React.FC = () => {
  const { showFilePanel, showSettingsPanel, showLibraryPanel } = useSidebarContext();
  const maximizedSidebarPanelKey = useCanvasStore(state => state.maximizedSidebarPanelKey);

  return (
    <Box bg="surface.panel" p={0} display="flex" flexDirection="column" flex="1" overflow="hidden" position="relative">
      <RenderCountBadgeWrapper componentName="Sidebar" position="top-right" />

      {!maximizedSidebarPanelKey && <SidebarToolGrid />}

      <SidebarPanels />

      {!maximizedSidebarPanelKey && !showFilePanel && !showSettingsPanel && !showLibraryPanel && <SidebarFooter />}
    </Box>
  );
};
