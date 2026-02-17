import type { UiSliceCreator, UiSlice } from './ui/types';
import { createLibraryUiState } from './ui/libraryUiSlice';
import { createPanelUiState } from './ui/panelUiSlice';
import { createSidebarUiState } from './ui/sidebarUiSlice';

export type { UiSlice } from './ui/types';

export const createUiSlice: UiSliceCreator<UiSlice> = (set, get, api) => ({
  ...createPanelUiState(set, get, api),
  ...createSidebarUiState(set, get, api),
  ...createLibraryUiState(set, get, api),
});
