import type { BaseSlice } from './baseSliceTypes';

const createDefaultSettings = (): BaseSlice['settings'] => ({
  keyboardMovementPrecision: 2,
  showRenderCountBadges: false,
  showMinimap: true,
  showTooltips: true,
  showLeftSidebar: true,
  withoutDistractionMode: false,
  defaultStrokeColor: '#000000',
  scaleStrokeWithZoom: true,
  exportPadding: 0,
  importResize: false,
  importResizeWidth: 64,
  importResizeHeight: 64,
  importApplyUnion: false,
  importAddFrame: false,
});

export const createBaseInitialState = (
  defaultMode: string
): Pick<
  BaseSlice,
  | 'elements'
  | 'activePlugin'
  | 'documentName'
  | 'isVirtualShiftActive'
  | 'lastUsedToolByGroup'
  | 'isPathInteractionDisabled'
  | 'pathCursorMode'
  | 'settings'
> => ({
  elements: [],
  activePlugin: defaultMode,
  documentName: 'VectorNest',
  isVirtualShiftActive: false,
  lastUsedToolByGroup: { basic: 'select' },
  isPathInteractionDisabled: false,
  pathCursorMode: 'default',
  settings: createDefaultSettings(),
});
