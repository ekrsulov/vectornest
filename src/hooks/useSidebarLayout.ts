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
    withoutDistractionMode,
    leftSidebarWidth,
    isLeftSidebarPinned,
    isLeftSidebarOpen,
  } = useCanvasStore(
    useShallow((state) => ({
      sidebarWidth: state.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH,
      isSidebarPinned: state.isSidebarPinned,
      isSidebarOpen: state.isSidebarOpen,
      showLeftSidebar: state.settings.showLeftSidebar,
      withoutDistractionMode: Boolean(state.settings.withoutDistractionMode),
      leftSidebarWidth: state.leftSidebarWidth ?? DEFAULT_SIDEBAR_WIDTH,
      isLeftSidebarPinned: state.isLeftSidebarPinned,
      isLeftSidebarOpen: state.isLeftSidebarOpen,
    }))
  );

  return useMemo(() => {
    const effectiveSidebarPinned = withoutDistractionMode ? false : isSidebarPinned;
    const effectiveSidebarOpen = withoutDistractionMode ? false : isSidebarOpen;
    const effectiveShowLeftSidebar = withoutDistractionMode ? false : showLeftSidebar;
    const effectiveLeftSidebarPinned = withoutDistractionMode ? false : isLeftSidebarPinned;
    const effectiveLeftSidebarOpen = withoutDistractionMode ? false : isLeftSidebarOpen;

    return {
      sidebarWidth,
      isSidebarPinned: effectiveSidebarPinned,
      isSidebarOpen: effectiveSidebarOpen,
      effectiveSidebarWidth: effectiveSidebarPinned ? sidebarWidth : 0,
      showLeftSidebar: effectiveShowLeftSidebar,
      leftSidebarWidth,
      isLeftSidebarPinned: effectiveLeftSidebarPinned,
      isLeftSidebarOpen: effectiveLeftSidebarOpen,
      effectiveLeftSidebarWidth:
        effectiveShowLeftSidebar && effectiveLeftSidebarPinned ? leftSidebarWidth : 0,
      isWithoutDistractionMode: withoutDistractionMode,
    };
  }, [
    sidebarWidth,
    isSidebarPinned,
    isSidebarOpen,
    showLeftSidebar,
    withoutDistractionMode,
    leftSidebarWidth,
    isLeftSidebarPinned,
    isLeftSidebarOpen,
  ]);
}
