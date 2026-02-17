import type { StateCreator } from 'zustand';
import type { ArtboardSlice, ArtboardState } from './types';
import { getPresetById } from './presets';
import type { Viewport } from '../../types';
import { fitViewportToActiveArtboard } from '../../utils/artboardViewportFitUtils';

// Re-export type for use in plugin definition
export type { ArtboardSlice };

/** Initial artboard state */
const INITIAL_STATE: ArtboardState = {
  enabled: false,
  selectedPresetId: null,
  customWidth: 1920,
  customHeight: 1080,
  backgroundColor: 'none',
  showMargins: false,
  marginSize: 20,
  exportBounds: null,
};

type ArtboardExportBounds = NonNullable<ArtboardState['exportBounds']>;

type ArtboardViewportState = {
  artboard: ArtboardState;
  viewport: Viewport;
  canvasSize: { width: number; height: number };
  setViewport?: (viewport: Partial<Viewport>) => void;
};

const areExportBoundsEqual = (
  left: ArtboardExportBounds | null,
  right: ArtboardExportBounds | null
): boolean => {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return (
    left.minX === right.minX &&
    left.minY === right.minY &&
    left.width === right.width &&
    left.height === right.height
  );
};

const shouldAutoFitArtboard = (
  previous: ArtboardState,
  next: ArtboardState
): boolean => {
  if (!next.enabled || !next.exportBounds) {
    return false;
  }

  const becameEnabled = !previous.enabled && next.enabled;
  const boundsChanged = !areExportBoundsEqual(previous.exportBounds, next.exportBounds);
  return becameEnabled || boundsChanged;
};

/** Create artboard slice */
export const createArtboardSlice: StateCreator<ArtboardSlice> = (set, get, _api) => ({
  artboard: INITIAL_STATE,

  updateArtboardState: (updates) => {
    let nextArtboard: ArtboardState | null = null;
    let shouldFit = false;
    set((state) => ({
      artboard: (() => {
        nextArtboard = { ...state.artboard, ...updates };
        shouldFit = shouldAutoFitArtboard(state.artboard, nextArtboard);
        return nextArtboard;
      })(),
    }));

    if (!shouldFit || !nextArtboard) {
      return;
    }

    const viewportState = get() as unknown as ArtboardViewportState;
    if (typeof viewportState.setViewport !== 'function') {
      return;
    }

    const nextViewport = fitViewportToActiveArtboard({
      viewport: viewportState.viewport,
      canvasSize: viewportState.canvasSize,
      artboard: nextArtboard,
    });
    if (!nextViewport) {
      return;
    }

    viewportState.setViewport(nextViewport);
  },

  setArtboardPreset: (presetId) => {
    const preset = getPresetById(presetId);
    if (!preset) return;

    get().updateArtboardState({
      enabled: true,
      selectedPresetId: presetId,
      customWidth: preset.width,
      customHeight: preset.height,
      // Top-left corner at (0, 0)
      exportBounds: {
        minX: 0,
        minY: 0,
        width: preset.width,
        height: preset.height,
      },
    });
  },

  setCustomArtboard: (width, height) => {
    get().updateArtboardState({
      enabled: true,
      selectedPresetId: 'custom',
      customWidth: width,
      customHeight: height,
      // Top-left corner at (0, 0)
      exportBounds: {
        minX: 0,
        minY: 0,
        width,
        height,
      },
    });
  },

  toggleArtboard: () => {
    const state = get();
    state.updateArtboardState({ enabled: !state.artboard.enabled });
  },

  getArtboardBounds: () => {
    const state = get();
    const { artboard } = state;
    if (!artboard.enabled || !artboard.exportBounds) {
      return null;
    }
    return {
      x: artboard.exportBounds.minX,
      y: artboard.exportBounds.minY,
      width: artboard.exportBounds.width,
      height: artboard.exportBounds.height,
    };
  },
});
