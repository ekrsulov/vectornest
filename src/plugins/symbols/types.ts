import type { CanvasElementBase, PathData } from '../../types';

export type Matrix = [number, number, number, number, number, number];

export interface SymbolInstanceTransform {
  translateX: number;
  translateY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface SymbolInstanceData {
  symbolId: string;
  width: number;
  height: number;
  /** Path data for simple symbols. Omit for complex symbols with rawContent (uses <use> reference) */
  pathData?: PathData;
  transform?: SymbolInstanceTransform;
  transformMatrix?: Matrix;
  clipPathId?: string;
  clipPathTemplateId?: string;
  filterId?: string;
  maskId?: string;
  sourceId?: string;
  mixBlendMode?: string;
  isolation?: 'auto' | 'isolate';
  // Style properties
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

export interface SymbolInstanceElement extends CanvasElementBase<'symbolInstance', SymbolInstanceData> {
  type: 'symbolInstance';
}
