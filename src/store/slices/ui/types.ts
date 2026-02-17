import type { StateCreator } from 'zustand';
import type { CanvasStore } from '../../canvasStore';

export type LeftSidebarActivePanel = 'structure' | 'library';

export interface SidebarState<TPanelKey extends string = string> {
  width: number;
  isPinned: boolean;
  isOpen: boolean;
  openPanelKey: TPanelKey | null;
  maximizedPanelKey: TPanelKey | null;
}

type GenericSidebarState = SidebarState<string>;

export interface PanelUiSlice {
  arrangePanelExpanded: boolean;
  editorAdvancedStrokeOpen: boolean;
  editorColorControlsOpen: boolean;
  isDraggingElements: boolean;
  showFilePanel: boolean;
  showSettingsPanel: boolean;
  showLibraryPanel: boolean;
  canvasSize: { width: number; height: number };
  svgStructureEnabledTags?: string[];
  svgStructureShowWithAnimationOnly: boolean;
  librarySearchEnabledTypes?: Record<string, boolean>;

  setArrangePanelExpanded: (expanded: boolean) => void;
  setEditorAdvancedStrokeOpen: (open: boolean) => void;
  setEditorColorControlsOpen: (open: boolean) => void;
  setIsDraggingElements: (isDragging: boolean) => void;
  setShowFilePanel: (show: boolean) => void;
  setShowSettingsPanel: (show: boolean) => void;
  setShowLibraryPanel: (show: boolean) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  setSvgStructureEnabledTags: (tags: string[]) => void;
  setSvgStructureShowWithAnimationOnly: (show: boolean) => void;
  setLibrarySearchEnabledTypes: (types: Record<string, boolean>) => void;
}

export interface MainSidebarUiSlice {
  openSidebarPanelKey: GenericSidebarState['openPanelKey'];
  maximizedSidebarPanelKey: GenericSidebarState['maximizedPanelKey'];
  sidebarWidth: GenericSidebarState['width'];
  isSidebarPinned: GenericSidebarState['isPinned'];
  isSidebarOpen: GenericSidebarState['isOpen'];

  setOpenSidebarPanelKey: (key: string | null) => void;
  setMaximizedSidebarPanelKey: (key: string | null) => void;
  setSidebarWidth: (width: number) => void;
  setIsSidebarPinned: (isPinned: boolean) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

export interface LeftSidebarUiSlice {
  leftSidebarWidth: GenericSidebarState['width'];
  isLeftSidebarPinned: GenericSidebarState['isPinned'];
  isLeftSidebarOpen: GenericSidebarState['isOpen'];
  leftOpenSidebarPanelKey: GenericSidebarState['openPanelKey'];
  leftMaximizedSidebarPanelKey: GenericSidebarState['maximizedPanelKey'];
  leftSidebarActivePanel: LeftSidebarActivePanel;

  setLeftSidebarWidth: (width: number) => void;
  setIsLeftSidebarPinned: (isPinned: boolean) => void;
  setIsLeftSidebarOpen: (isOpen: boolean) => void;
  openLeftSidebar: () => void;
  closeLeftSidebar: () => void;
  toggleLeftSidebar: () => void;
  setLeftOpenSidebarPanelKey: (key: string | null) => void;
  setLeftMaximizedSidebarPanelKey: (key: string | null) => void;
  setLeftSidebarActivePanel: (panel: LeftSidebarActivePanel) => void;
}

export interface LibraryUiSlice {
  librarySearchQuery: string;
  lastActiveLibraryPanelKey: string | null;
  lastActiveLeftLibraryPanelKey: string | null;

  setLibrarySearchQuery: (query: string) => void;
  saveCurrentLibraryState: () => void;
  restoreLibraryState: () => void;
  saveCurrentLeftLibraryState: () => void;
  restoreLeftLibraryState: () => void;
}

export interface UiSlice
  extends
    PanelUiSlice,
    MainSidebarUiSlice,
    LeftSidebarUiSlice,
    LibraryUiSlice {}

export type UiSliceCreator<TSlice> = StateCreator<CanvasStore, [], [], TSlice>;
