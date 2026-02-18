import React, { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import { useResponsive } from '../hooks';
import { SidebarPanelScopeProvider } from '../contexts/SidebarPanelStateContext';
import { LeftSidebarContent } from './components/LeftSidebarContent';
import { SidebarShell } from './components/SidebarShell';
import { DEFAULT_MODE } from '../constants';

// Semantic tokens resolve dark/light automatically — no need for useColorModeValue
const SIDEBAR_BG = 'surface.sidebar';
const OVERLAY_BG = 'blackAlpha.600';

export const LeftSidebar: React.FC = () => {
  const showLeftSidebar = useCanvasStore((state) => state.settings.showLeftSidebar);
  const { isDesktop, canPinSidebar } = useResponsive();

  const {
    activePlugin,
    showFilePanel,
    showSettingsPanel,
    showLibraryPanel,
    setShowLibraryPanel,
    setMode,
    leftSidebarWidth,
    isLeftSidebarPinned,
    isLeftSidebarOpen,
    setIsLeftSidebarPinned,
    setIsLeftSidebarOpen,
    updateSettings,
  } = useCanvasStore(
    useShallow((state) => ({
      activePlugin: state.activePlugin,
      showFilePanel: state.showFilePanel,
      showSettingsPanel: state.showSettingsPanel,
      showLibraryPanel: state.showLibraryPanel,
      setShowLibraryPanel: state.setShowLibraryPanel,
      setMode: state.setMode,
      leftSidebarWidth: state.leftSidebarWidth,
      isLeftSidebarPinned: state.isLeftSidebarPinned,
      isLeftSidebarOpen: state.isLeftSidebarOpen,
      setIsLeftSidebarPinned: state.setIsLeftSidebarPinned,
      setIsLeftSidebarOpen: state.setIsLeftSidebarOpen,
      updateSettings: state.updateSettings,
    }))
  );

  const prevShowLeftSidebarRef = useRef(showLeftSidebar);

  useEffect(() => {
    if (!prevShowLeftSidebarRef.current && showLeftSidebar) {
      setIsLeftSidebarOpen(true);
    }
    prevShowLeftSidebarRef.current = showLeftSidebar;
  }, [showLeftSidebar, setIsLeftSidebarOpen]);

  useEffect(() => {
    if (!showLeftSidebar) return;
    if (isDesktop && isLeftSidebarPinned && !isLeftSidebarOpen) {
      setIsLeftSidebarOpen(true);
    }
  }, [showLeftSidebar, isDesktop, isLeftSidebarPinned, isLeftSidebarOpen, setIsLeftSidebarOpen]);

  useEffect(() => {
    if (!canPinSidebar && showLeftSidebar) {
      updateSettings({ showLeftSidebar: false });
    }
  }, [canPinSidebar, showLeftSidebar, updateSettings]);

  useEffect(() => {
    if (!showLeftSidebar) return;
    if (!canPinSidebar && isLeftSidebarPinned) {
      setIsLeftSidebarPinned(false);
      setIsLeftSidebarOpen(false);
    }
  }, [showLeftSidebar, canPinSidebar, isLeftSidebarPinned, setIsLeftSidebarPinned, setIsLeftSidebarOpen]);

  useEffect(() => {
    if (!showLeftSidebar) return;
    if (showLibraryPanel) {
      setShowLibraryPanel(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLeftSidebar]);

  useEffect(() => {
    if (!showLeftSidebar) return;
    if ((activePlugin === 'svgStructure' || activePlugin === 'library') && !showFilePanel && !showSettingsPanel) {
      setMode(DEFAULT_MODE);
    }
  }, [showLeftSidebar, activePlugin, showFilePanel, showSettingsPanel, setMode]);

  if (!showLeftSidebar) {
    return null;
  }

  return (
    <SidebarPanelScopeProvider scope="left">
      <SidebarShell
        side="left"
        width={leftSidebarWidth}
        isPinned={isLeftSidebarPinned}
        isOpen={isLeftSidebarOpen}
        sidebarBg={SIDEBAR_BG}
        overlayBg={OVERLAY_BG}
        onClose={() => setIsLeftSidebarOpen(false)}
      >
        <LeftSidebarContent />
      </SidebarShell>
    </SidebarPanelScopeProvider>
  );
};
