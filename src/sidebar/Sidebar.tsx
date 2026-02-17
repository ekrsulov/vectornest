import React, { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import { SidebarContent } from './components/SidebarContent';
import { SidebarShell } from './components/SidebarShell';
import { DEFAULT_MODE } from '../constants';
import { pluginManager } from '../utils/pluginManager';
import { SidebarContext, type SidebarContextValue } from '../contexts/SidebarContext';
import { useResponsive } from '../hooks';

// Semantic tokens resolve dark/light automatically — no need for useColorModeValue
const SIDEBAR_BG = 'surface.sidebar';
const OVERLAY_BG = 'blackAlpha.600';

export const Sidebar: React.FC = () => {
  const { isDesktop, canPinSidebar } = useResponsive();

  const {
    activePlugin,
    setMode,
    showFilePanel,
    showSettingsPanel,
    showLibraryPanel,
    setShowFilePanel,
    setShowSettingsPanel,
    setShowLibraryPanel,
    setOpenSidebarPanelKey,
    isArrangeExpanded,
    setIsArrangeExpanded,
    saveCurrentLibraryState,
    restoreLibraryState,
    sidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
    setIsSidebarPinned,
    setIsSidebarOpen,
  } = useCanvasStore(
    useShallow((state) => ({
      activePlugin: state.activePlugin,
      setMode: state.setMode,
      showFilePanel: state.showFilePanel,
      showSettingsPanel: state.showSettingsPanel,
      showLibraryPanel: state.showLibraryPanel,
      setShowFilePanel: state.setShowFilePanel,
      setShowSettingsPanel: state.setShowSettingsPanel,
      setShowLibraryPanel: state.setShowLibraryPanel,
      setOpenSidebarPanelKey: state.setOpenSidebarPanelKey,
      isArrangeExpanded: state.arrangePanelExpanded,
      setIsArrangeExpanded: state.setArrangePanelExpanded,
      saveCurrentLibraryState: state.saveCurrentLibraryState,
      restoreLibraryState: state.restoreLibraryState,
      sidebarWidth: state.sidebarWidth,
      isSidebarPinned: state.isSidebarPinned,
      isSidebarOpen: state.isSidebarOpen,
      setIsSidebarPinned: state.setIsSidebarPinned,
      setIsSidebarOpen: state.setIsSidebarOpen,
    }))
  );

  useEffect(() => {
    if (isDesktop && isSidebarPinned && !isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  }, [isDesktop, isSidebarPinned, isSidebarOpen, setIsSidebarOpen]);

  useEffect(() => {
    if (!canPinSidebar && isSidebarPinned) {
      setIsSidebarPinned(false);
      setIsSidebarOpen(false);
    }
  }, [canPinSidebar, isSidebarPinned, setIsSidebarPinned, setIsSidebarOpen]);

  useEffect(() => {
    if (activePlugin && !pluginManager.isInSidebarPanelMode()) {
      if (showLibraryPanel) {
        saveCurrentLibraryState();
      }
      setShowFilePanel(false);
      setShowSettingsPanel(false);
      setShowLibraryPanel(false);
      setOpenSidebarPanelKey(null);
    }
  }, [
    activePlugin,
    showLibraryPanel,
    setShowFilePanel,
    setShowSettingsPanel,
    setShowLibraryPanel,
    setOpenSidebarPanelKey,
    saveCurrentLibraryState,
  ]);

  const handleToolClick = useCallback(
    (toolName: string) => {
      if (showLibraryPanel && toolName !== 'library') {
        saveCurrentLibraryState();
      }

      if (toolName === 'file') {
        if (showFilePanel) {
          setShowFilePanel(false);
          setMode(DEFAULT_MODE);
        } else {
          setShowFilePanel(true);
          setShowSettingsPanel(false);
          setShowLibraryPanel(false);
          setMode('file');
          setIsSidebarOpen(true);
        }
      } else if (toolName === 'settings') {
        if (showSettingsPanel) {
          setShowSettingsPanel(false);
          setOpenSidebarPanelKey(null);
          setMode(DEFAULT_MODE);
        } else {
          setShowSettingsPanel(true);
          setShowFilePanel(false);
          setShowLibraryPanel(false);
          setOpenSidebarPanelKey(null);
          setMode('settings');
          setIsSidebarOpen(true);
        }
      } else if (toolName === 'library') {
        if (showLibraryPanel) {
          saveCurrentLibraryState();
          setShowLibraryPanel(false);
          setOpenSidebarPanelKey(null);
          setMode(DEFAULT_MODE);
        } else {
          setShowLibraryPanel(true);
          setShowFilePanel(false);
          setShowSettingsPanel(false);
          restoreLibraryState();
          setMode('library');
          setIsSidebarOpen(true);
        }
      } else {
        setShowFilePanel(false);
        setShowSettingsPanel(false);
        setShowLibraryPanel(false);
        setMode(toolName);
      }
    },
    [
      showFilePanel,
      showSettingsPanel,
      showLibraryPanel,
      setShowFilePanel,
      setShowSettingsPanel,
      setShowLibraryPanel,
      setMode,
      setOpenSidebarPanelKey,
      saveCurrentLibraryState,
      restoreLibraryState,
      setIsSidebarOpen,
    ]
  );

  const handleTogglePin = useCallback(() => {
    if (!canPinSidebar) return;
    setIsSidebarPinned(!isSidebarPinned);
  }, [canPinSidebar, isSidebarPinned, setIsSidebarPinned]);

  const sidebarContextValue: SidebarContextValue = useMemo(
    () => ({
      activePlugin,
      showFilePanel,
      showSettingsPanel,
      showLibraryPanel,
      isPinned: isSidebarPinned,
      isDesktop,
      canPinSidebar,
      isArrangeExpanded,
      setMode,
      onToolClick: handleToolClick,
      onTogglePin: handleTogglePin,
      setIsArrangeExpanded,
    }),
    [
      activePlugin,
      showFilePanel,
      showSettingsPanel,
      showLibraryPanel,
      isSidebarPinned,
      isDesktop,
      canPinSidebar,
      isArrangeExpanded,
      setMode,
      handleToolClick,
      handleTogglePin,
      setIsArrangeExpanded,
    ]
  );

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <SidebarShell
        side="right"
        width={sidebarWidth}
        isPinned={isSidebarPinned}
        isOpen={isSidebarOpen}
        sidebarBg={SIDEBAR_BG}
        overlayBg={OVERLAY_BG}
        onClose={() => setIsSidebarOpen(false)}
      >
        <SidebarContent />
      </SidebarShell>
    </SidebarContext.Provider>
  );
};
