import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { Sticker } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createStickerEffectSlice } from './slice';
import { StickerEffectPanel } from './StickerEffectPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('stickerEffect', ['stickerEffect'], 'temporal');

const stickerEffectSliceFactory = createPluginSlice(createStickerEffectSlice);

export const stickerEffectPlugin: PluginDefinition<CanvasStore> = {
  id: 'stickerEffect',
  metadata: {
    label: 'Sticker Effect',
    icon: Sticker,
    cursor: 'default',
  },
  supportsMobile: true,
  dependencies: ['filter'],
  slices: [stickerEffectSliceFactory],
  relatedPluginPanels: [
    {
      id: 'stickerEffect-panel',
      targetPlugin: 'generatorLibrary',
      component: StickerEffectPanel,
      order: 170,
    },
  ],
};

export type { StickerEffectPluginSlice } from './slice';
