/**
 * Types for the Library Filters plugin
 */

export type FilterPresetType = 
  // Basic Filters
  | 'blur' 
  | 'drop-shadow'
  // Color Effects
  | 'grayscale' 
  | 'sepia' 
  | 'invert' 
  | 'brightness' 
  | 'contrast' 
  | 'saturate' 
  | 'hue-rotate'
  | 'posterize'
  // Special Effects
  | 'emboss' 
  | 'sharpen' 
  | 'edge-detect' 
  | 'glow' 
  | 'bevel' 
  | 'motion-blur'
  | 'noise' 
  | 'wave-distortion'
  // Artistic Filters
  | 'oil-painting' 
  | 'watercolor' 
  | 'vintage' 
  | 'chromatic-aberration'
  | 'neon-glow' 
  | 'mosaic' 
  | 'glitch' 
  | 'pixelate'
  // Artistic Presets (inspired)
  | 'dancing-stroke' 
  | 'smoke' 
  | 'waves' 
  | 'paper-texture' 
  | 'zebra' 
  | 'net' 
  | 'dust'
  | 'colored-stripes' 
  | 'colored-spots' 
  | 'colored-flame' 
  | 'advanced-watercolor';

export interface FilterPrimitive {
  type: string;
  [key: string]: unknown;
}

export interface FilterDefinition {
  id: string;
  name: string;
  type: FilterPresetType;
  primitives: FilterPrimitive[];
  category: 'basic' | 'color' | 'special' | 'artistic' | 'preset';
}

export interface FilterPresetDefinition {
  type: FilterPresetType;
  name: string;
  category: 'basic' | 'color' | 'special' | 'artistic' | 'preset';
  createFilter: () => Omit<FilterDefinition, 'id'>;
}
