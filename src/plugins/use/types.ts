import type { CanvasElementBase, PathData } from '../../types';

export type Matrix = [number, number, number, number, number, number];

export interface UseTransform {
  translateX: number;
  translateY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Reference type for <use> elements
 * - 'element': References a regular canvas element by ID
 * - 'symbol': References a symbol definition in <defs>
 * - 'external': References an external URL (not fully supported yet)
 */
export type UseReferenceType = 'element' | 'symbol' | 'external';

/**
 * Style overrides that can be applied to a <use> element
 * These override the styles of the referenced element
 */
export interface UseStyleOverrides {
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  strokeDasharray?: string;
  fillColor?: string;
  fillOpacity?: number;
  fillRule?: 'nonzero' | 'evenodd';
  opacity?: number;
}

/**
 * Data for a <use> element
 * This is the core data structure for rendering cloned elements
 */
export interface UseElementData {
  /**
   * The href reference (without #) - can be element ID or symbol ID
   */
  href: string;

  /**
   * Original href imported from SVG before it was remapped to internal canvas IDs.
   */
  originalHref?: string;

  /**
   * Original x attribute imported from SVG. Preserved so native <use> export can
   * retain browser transform semantics for unedited imported instances.
   */
  originalXAttr?: string;

  /**
   * Original y attribute imported from SVG. Preserved so native <use> export can
   * retain browser transform semantics for unedited imported instances.
   */
  originalYAttr?: string;

  /**
   * Original transform attribute imported from SVG. Preserved so native <use>
   * export does not collapse transform lists into a single matrix.
   */
  originalTransformAttr?: string;
  
  /**
   * Type of reference
   */
  referenceType: UseReferenceType;
  
  /**
   * Position offset (x attribute in SVG <use>)
   */
  x: number;
  
  /**
   * Position offset (y attribute in SVG <use>)
   */
  y: number;
  
  /**
   * Width of the use element (for symbols with viewBox)
   */
  width?: number;
  
  /**
   * Height of the use element (for symbols with viewBox)
   */
  height?: number;
  
  /**
   * Transform as structured object
   */
  transform?: UseTransform;
  
  /**
   * Transform as matrix (takes precedence over transform)
   */
  transformMatrix?: Matrix;
  
  /**
   * Style overrides - these are applied on top of referenced element styles
   */
  styleOverrides?: UseStyleOverrides;
  
  /**
   * Cached path data for rendering (for symbol references or when element is resolved)
   */
  cachedPathData?: PathData;

  /**
   * Raw SVG content for referenced grouped definitions that should be rendered inline.
   */
  rawContent?: string;

  /**
   * When true, export should preserve this reference as a native <use> instead
   * of materializing cached geometry/raw content. Used for imported refs that
   * originally pointed at reusable defs content.
   */
  preserveHrefOnExport?: boolean;
  
  /**
   * Cached bounds for the referenced element
   */
  cachedBounds?: {
    minX: number;
    minY: number;
    width: number;
    height: number;
  };
  
  /**
   * Clip path ID
   */
  clipPathId?: string;
  
  /**
   * Clip path template ID
   */
  clipPathTemplateId?: string;
  
  /**
   * Filter ID
   */
  filterId?: string;
  
  /**
   * Source ID from import
   */
  sourceId?: string;
}

export interface UseElement extends CanvasElementBase<'use', UseElementData> {
  type: 'use';
}
