/** Types for the Artboard plugin */

/** Category of artboard preset */
export type ArtboardCategory = 'paper' | 'social' | 'print' | 'video' | 'screens' | 'custom';

/** Preset artboard definition */
export interface ArtboardPreset {
  id: string;
  category: ArtboardCategory;
  label: string;
  width: number;   // in SVG units (px)
  height: number;  // in SVG units (px)
  description?: string;
}

/** Artboard state */
export interface ArtboardState {
  enabled: boolean;
  selectedPresetId: string | null;
  customWidth: number;
  customHeight: number;
  backgroundColor: string;
  showMargins: boolean;
  marginSize: number;
  showSizes: boolean;
  // Fixed viewBox for export
  exportBounds: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  } | null;
}

/** Artboard slice */
export interface ArtboardSlice {
  artboard: ArtboardState;
  updateArtboardState: (updates: Partial<ArtboardState>) => void;
  setArtboardPreset: (presetId: string) => void;
  setCustomArtboard: (width: number, height: number) => void;
  toggleArtboard: () => void;
  getArtboardBounds: () => { x: number; y: number; width: number; height: number } | null;
}
