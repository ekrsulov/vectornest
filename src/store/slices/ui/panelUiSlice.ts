import { type PanelUiSlice, type UiSliceCreator } from './types';

const IS_DEV = import.meta.env.DEV;

export const createPanelUiState: UiSliceCreator<PanelUiSlice> = (set, get) => ({
  arrangePanelExpanded: IS_DEV,
  editorAdvancedStrokeOpen: false,
  editorColorControlsOpen: IS_DEV,
  isDraggingElements: false,
  showFilePanel: false,
  showSettingsPanel: false,
  showLibraryPanel: false,
  canvasSize: typeof window !== 'undefined'
    ? { width: window.innerWidth, height: window.innerHeight }
    : { width: 1, height: 1 },
  svgStructureEnabledTags: undefined,
  svgStructureShowWithAnimationOnly: false,
  librarySearchEnabledTypes: undefined,

  setArrangePanelExpanded: (expanded) => set({ arrangePanelExpanded: expanded }),
  setEditorAdvancedStrokeOpen: (open) => set({ editorAdvancedStrokeOpen: open }),
  setEditorColorControlsOpen: (open) => set({ editorColorControlsOpen: open }),
  setIsDraggingElements: (isDragging) => set({ isDraggingElements: isDragging }),
  setShowFilePanel: (show) => set({ showFilePanel: show }),
  setShowSettingsPanel: (show) => set({ showSettingsPanel: show }),
  setShowLibraryPanel: (show) => set({ showLibraryPanel: show }),
  setCanvasSize: (size) => {
    const current = get().canvasSize;
    if (current.width === size.width && current.height === size.height) {
      return;
    }
    set({ canvasSize: size });
  },
  setSvgStructureEnabledTags: (tags) => set({ svgStructureEnabledTags: tags }),
  setSvgStructureShowWithAnimationOnly: (show) => set({ svgStructureShowWithAnimationOnly: show }),
  setLibrarySearchEnabledTypes: (types) => set({ librarySearchEnabledTypes: types }),
});
