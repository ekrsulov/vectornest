import { type LibraryUiSlice, type UiSliceCreator } from './types';

export const createLibraryUiState: UiSliceCreator<LibraryUiSlice> = (set) => ({
  librarySearchQuery: '',
  lastActiveLibraryPanelKey: null,
  lastActiveLeftLibraryPanelKey: null,

  setLibrarySearchQuery: (query) => set({ librarySearchQuery: query }),
  saveCurrentLibraryState: () => set((state) => {
    if (state.openSidebarPanelKey?.startsWith('sidebar:library:')) {
      return { lastActiveLibraryPanelKey: state.openSidebarPanelKey };
    }
    if (state.showLibraryPanel) {
      return { lastActiveLibraryPanelKey: state.openSidebarPanelKey };
    }
    return {};
  }),
  restoreLibraryState: () => set((state) => ({
    openSidebarPanelKey: state.lastActiveLibraryPanelKey,
  })),
  saveCurrentLeftLibraryState: () => set((state) => {
    if (state.leftOpenSidebarPanelKey?.startsWith('sidebar:library:')) {
      return { lastActiveLeftLibraryPanelKey: state.leftOpenSidebarPanelKey };
    }
    return {};
  }),
  restoreLeftLibraryState: () => set((state) => ({
    leftOpenSidebarPanelKey: state.lastActiveLeftLibraryPanelKey,
  })),
});
