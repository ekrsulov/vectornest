import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import { DEFAULT_SIDEBAR_WIDTH } from '../constants';

export function useSidebarLayout() {
  const {
    sidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
    showLeftSidebar,
    leftSidebarWidth,
    isLeftSidebarPinned,
    isLeftSidebarOpen,
  } = useCanvasStore(
    useShallow((state) => ({
      sidebarWidth: state.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH,
      isSidebarPinned: state.isSidebarPinned,
      isSidebarOpen: state.isSidebarOpen,
      showLeftSidebar: state.settings.showLeftSidebar,
      leftSidebarWidth: state.leftSidebarWidth ?? DEFAULT_SIDEBAR_WIDTH,
      isLeftSidebarPinned: state.isLeftSidebarPinned,
      isLeftSidebarOpen: state.isLeftSidebarOpen,
    }))
  );

  return useMemo(() => ({
    sidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
    effectiveSidebarWidth: isSidebarPinned ? sidebarWidth : 0,
    leftSidebarWidth,
    isLeftSidebarPinned,
    isLeftSidebarOpen,
    effectiveLeftSidebarWidth: showLeftSidebar && isLeftSidebarPinned ? leftSidebarWidth : 0,
  }), [
    sidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
    showLeftSidebar,
    leftSidebarWidth,
    isLeftSidebarPinned,
    isLeftSidebarOpen,
  ]);
}
