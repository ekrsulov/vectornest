import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createWireframePluginSlice } from './slice';
import type { WireframePluginSlice } from './slice';
import { WireframePanel } from './WireframePanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('wireframe', ['wireframe'], 'temporal');

const wireframeSliceFactory = createPluginSlice(createWireframePluginSlice);
const hasWireframeSlice = (state: unknown): state is WireframePluginSlice => {
  return Boolean(state && typeof state === 'object' && 'wireframe' in (state as Record<string, unknown>));
};

export const wireframePlugin: PluginDefinition<CanvasStore> = {
  id: 'wireframe',
  metadata: {
    label: 'Wireframe',
    cursor: 'default',
  },
  slices: [wireframeSliceFactory],
  renderBehavior: (state, { colorMode }) => {
    if (!hasWireframeSlice(state) || !state.wireframe?.enabled) {
      return null;
    }

    const strokeColor = colorMode === 'dark' ? '#ffffff' : '#000000';

    return {
      path: {
        strokeWidth: 1,
        strokeColor,
        scaleStrokeWithZoom: false,
        strokeDasharray: 'none',
        ...(state.wireframe.removeFill
          ? { fillColor: strokeColor, fillOpacity: 0.01 }
          : {}),
        disableFilter: true,
      },
      element: {
        image: {
          mode: 'wireframe',
          strokeColor,
          strokeWidth: 1,
          scaleStrokeWithZoom: false,
          showImage: !(state.wireframe.removeFill ?? false),
          opacity: state.wireframe.removeFill ? 0.15 : undefined,
          ...(state.wireframe.removeFill
            ? { fillColor: strokeColor, fillOpacity: 0.01 }
            : {}),
          disableFilter: true,
        },
        nativeShape: {
          mode: 'wireframe',
          strokeColor,
          strokeWidth: 1,
          strokeOpacity: 1,
          scaleStrokeWithZoom: false,
          strokeDasharray: 'none',
          ...(state.wireframe.removeFill
            ? { fillColor: strokeColor, fillOpacity: 0.02 }
            : {}),
          disableFilter: true,
        },
        nativeText: {
          mode: 'wireframe',
          strokeColor,
          strokeWidth: 0.75,
          scaleStrokeWithZoom: false,
          strokeDasharray: 'none',
          ...(state.wireframe.removeFill
            ? { fill: 'none', opacity: 0.4 }
            : {}),
          disableFilter: true,
        },
        symbolInstance: {
          strokeColor,
          strokeWidth: 1,
          scaleStrokeWithZoom: false,
          disableFilter: true,
        },
      },
    };
  },
  sidebarPanels: [
    {
      key: 'wireframe',
      condition: (ctx) => ctx.showSettingsPanel,
      component: WireframePanel,
    },
  ],
};

export type { WireframePluginSlice };
