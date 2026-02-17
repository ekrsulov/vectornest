import type { SnapProvider } from '../types/extensionPoints';
import type { CanvasStore } from '../store/canvasStore';

const providers: SnapProvider[] = [];

export const registerSnapProvider = (provider: SnapProvider): void => {
  const existingIndex = providers.findIndex((p) => p.pluginId === provider.pluginId);
  if (existingIndex >= 0) {
    providers[existingIndex] = provider;
    return;
  }
  providers.push(provider);
};

export const unregisterSnapProvider = (pluginId: string): void => {
  const idx = providers.findIndex((p) => p.pluginId === pluginId);
  if (idx >= 0) {
    providers.splice(idx, 1);
  }
};

export const getActiveSnapProviders = (state: CanvasStore): SnapProvider[] => {
  return providers
    .filter((p) => {
      try {
        return p.isActive(state);
      } catch {
        return false;
      }
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
};
