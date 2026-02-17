import type { PluginDefinition, PluginSliceFactory, CanvasLayerContribution } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createArtboardSlice, type ArtboardSlice } from './slice';
import { ArtboardPanel } from './ArtboardPanel';
import { ArtboardLayer } from './ArtboardLayer';
import { registerStateKeys } from '../../store/persistenceRegistry';
import { isMonoColor, transformMonoColor } from '../../utils/colorModeSyncUtils';

// Register persistence keys
registerStateKeys('artboard', ['artboard'], 'both');

/** Artboard slice factory */
const artboardSliceFactory: PluginSliceFactory<CanvasStore> = (set, _get, _api) => {
  const slice = createArtboardSlice(
    set as unknown as Parameters<typeof createArtboardSlice>[0],
    _get as unknown as Parameters<typeof createArtboardSlice>[1],
    _api as unknown as Parameters<typeof createArtboardSlice>[2]
  );
  return { state: slice };
};

/** Canvas layer contribution for rendering the artboard */
const artboardLayer: CanvasLayerContribution = {
  id: 'artboard-layer',
  placement: 'background',
  render: (context) => <ArtboardLayer context={context} />,
};

/** Artboard plugin definition */
export const artboardPlugin: PluginDefinition<CanvasStore> = {
  id: 'artboard',
  metadata: {
    label: 'Artboard',
    cursor: 'default',
  },
  slices: [artboardSliceFactory],
  onColorModeChange: ({ nextColorMode, store }) => {
    const state = store.getState() as CanvasStore & ArtboardSlice;
    const backgroundColor = state.artboard?.backgroundColor;

    if (!backgroundColor || !isMonoColor(backgroundColor)) {
      return;
    }

    const nextBackgroundColor = transformMonoColor(backgroundColor, nextColorMode);
    if (nextBackgroundColor === backgroundColor) {
      return;
    }

    state.updateArtboardState?.({ backgroundColor: nextBackgroundColor });
  },
  canvasLayers: [artboardLayer],
  sidebarPanels: [
    {
      key: 'artboard',
      condition: (ctx) => ctx.showSettingsPanel,
      component: ArtboardPanel,
    },
  ],
  createApi: ({ store }) => ({
    /**
     * Get the export bounds when artboard is enabled.
     * Returns null if artboard is disabled.
     */
    getExportBounds: () => {
      const state = store.getState() as CanvasStore & ArtboardSlice;
      const artboardState = state.artboard;
      if (!artboardState?.enabled || !artboardState?.exportBounds) {
        return null;
      }
      return artboardState.exportBounds;
    },
    /**
     * Check if artboard is currently enabled.
     */
    isEnabled: () => {
      const state = store.getState() as CanvasStore & ArtboardSlice;
      return state.artboard?.enabled ?? false;
    },
  }),
};
