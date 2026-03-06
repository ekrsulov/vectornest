import type { SVGAnimation } from '../animationSystem/types';

export type TextEffectCategory =
  | 'shadow'
  | 'glow'
  | 'outline'
  | '3d'
  | 'distortion'
  | 'artistic'
  | 'animated'
  | 'energy'
  | 'material'
  | 'digital'
  | 'print';

export interface TextEffectPreset {
  /** Unique preset identifier */
  id: string;
  /** Display label */
  label: string;
  /** Category for filtering */
  category: TextEffectCategory;
  /** Description of the effect */
  description: string;
  /** SVG filter content (primitives inside <filter>) */
  filterContent: string;
  /** Extra filter attributes (x, y, width, height overflow) */
  filterAttributes?: Record<string, string>;
  /** SVG string for preview thumbnail (animated via SMIL) */
  previewSvg: string;
  /** Default text used for previewing */
  defaultText?: string;
  /** Whether the preview preserves original colors */
  preserveColors?: boolean;
  /** Keep the selected text fill instead of copying the preview paint */
  preserveSourceFill?: boolean;
  /** Apply the preset filter even when the preview paint comes from defs */
  forceApplyFilter?: boolean;
}

export interface TextEffectRenderLayer {
  offsetX: number;
  offsetY: number;
  renderBeforeBase?: boolean;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  opacity?: number;
  maskId?: string;
  clipPathId?: string;
  filterId?: string;
  useSourceFill?: boolean;
  animations?: Array<Omit<SVGAnimation, 'id' | 'targetElementId'>>;
}

export interface TextEffectsLibrarySlice {
  /** Currently selected preset from search */
  textEffectsSelectedFromSearch: string | null;
  selectTextEffectFromSearch: (id: string | null) => void;
}
