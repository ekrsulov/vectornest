import { DEFAULT_SIDEBAR_WIDTH } from '../../../constants';
import { type MainSidebarUiSlice, type LeftSidebarUiSlice, type SidebarState, type UiSliceCreator } from './types';

const IS_DEV = import.meta.env.DEV;

/** Default sidebar state. Persist middleware hydrates previously saved values on top. */
const createSidebarState = (): SidebarState<string> => ({
  width: DEFAULT_SIDEBAR_WIDTH,
  isPinned: IS_DEV,
  isOpen: IS_DEV,
  openPanelKey: null,
  maximizedPanelKey: null,
});

export const createSidebarUiState: UiSliceCreator<MainSidebarUiSlice & LeftSidebarUiSlice> = (set) => {
  const mainSidebar = createSidebarState();
  const leftSidebar = createSidebarState();

  return {
    openSidebarPanelKey: mainSidebar.openPanelKey,
    maximizedSidebarPanelKey: mainSidebar.maximizedPanelKey,
    sidebarWidth: mainSidebar.width,
    isSidebarPinned: mainSidebar.isPinned,
    isSidebarOpen: mainSidebar.isOpen,

    leftSidebarWidth: leftSidebar.width,
    isLeftSidebarPinned: leftSidebar.isPinned,
    isLeftSidebarOpen: leftSidebar.isOpen,
    leftOpenSidebarPanelKey: leftSidebar.openPanelKey,
    leftMaximizedSidebarPanelKey: leftSidebar.maximizedPanelKey,
    leftSidebarActivePanel: 'structure',

    setOpenSidebarPanelKey: (key) => set({ openSidebarPanelKey: key }),
    setMaximizedSidebarPanelKey: (key) => set({ maximizedSidebarPanelKey: key }),
    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    setIsSidebarPinned: (isPinned) => set({ isSidebarPinned: isPinned }),
    setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    openSidebar: () => set({ isSidebarOpen: true }),
    closeSidebar: () => set({ isSidebarOpen: false }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    setLeftSidebarWidth: (width) => set({ leftSidebarWidth: width }),
    setIsLeftSidebarPinned: (isPinned) => set({ isLeftSidebarPinned: isPinned }),
    setIsLeftSidebarOpen: (isOpen) => set({ isLeftSidebarOpen: isOpen }),
    openLeftSidebar: () => set({ isLeftSidebarOpen: true }),
    closeLeftSidebar: () => set({ isLeftSidebarOpen: false }),
    toggleLeftSidebar: () => set((state) => ({ isLeftSidebarOpen: !state.isLeftSidebarOpen })),
    setLeftOpenSidebarPanelKey: (key) => set({ leftOpenSidebarPanelKey: key }),
    setLeftMaximizedSidebarPanelKey: (key) => set({ leftMaximizedSidebarPanelKey: key }),
    setLeftSidebarActivePanel: (panel) => set({ leftSidebarActivePanel: panel }),
  };
};
