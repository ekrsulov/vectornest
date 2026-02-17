import type { PaintInstance } from './paintTypeRegistry';

export interface Preset {
  id: string;
  name: string;
  strokeWidth: number;
  strokeColor: string;
  strokeOpacity: number;
  fillColor: string;
  fillOpacity: number;
  fillPaint?: PaintInstance;
  strokePaint?: PaintInstance;
}

type PresetProvider = (colorMode: 'light' | 'dark') => Preset[];

class StylePresetRegistry {
  private providers: Array<{ id: string; provider: PresetProvider }> = [];

  register(id: string, provider: PresetProvider): void {
    const existingIndex = this.providers.findIndex((entry) => entry.id === id);
    if (existingIndex >= 0) {
      this.providers[existingIndex] = { id, provider };
      return;
    }
    this.providers.push({ id, provider });
  }

  unregister(id: string): void {
    this.providers = this.providers.filter((entry) => entry.id !== id);
  }

  getPresets(colorMode: 'light' | 'dark'): Preset[] {
    return this.providers.flatMap((entry) => entry.provider(colorMode));
  }
}

export const stylePresetRegistry = new StylePresetRegistry();

export function getFillAndStrokePresets(colorMode: 'light' | 'dark'): Preset[] {
  return stylePresetRegistry.getPresets(colorMode);
}
