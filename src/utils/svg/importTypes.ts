import type { PathData } from '../../types';

export interface ImportedPathElement {
  type: 'path';
  data: PathData;
}

export interface ImportedGroupElement {
  type: 'group';
  name?: string;
  data?: Record<string, unknown>;
  children: ImportedElement[];
}

export interface ImportedNativeShapeElement {
  type: 'nativeShape';
  data: Record<string, unknown>;
}

export interface ImportedNativeTextElement {
  type: 'nativeText';
  data: Record<string, unknown>;
}

export interface ImportedImageElement {
  type: 'image';
  data: Record<string, unknown>;
}

export interface ImportedForeignObjectElement {
  type: 'foreignObject';
  data: {
    x: number;
    y: number;
    width: number;
    height: number;
    innerHtml: string;
    overflow?: string;
    requiredExtensions?: string;
    transformMatrix?: [number, number, number, number, number, number];
    filterId?: string;
    clipPathId?: string;
    clipPathTemplateId?: string;
    maskId?: string;
    mixBlendMode?: string;
    isolation?: 'auto' | 'isolate';
    opacity?: number;
    sourceId?: string;
  };
}

export interface ImportedSymbolInstanceElement {
  type: 'symbolInstance';
  data: Record<string, unknown>;
}

export interface ImportedUseElement {
  type: 'use';
  data: Record<string, unknown>;
}

export interface ImportedEmbeddedSvgElement {
  type: 'embeddedSvg';
  data: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    viewBox?: string;
    preserveAspectRatio?: string;
    overflow?: string;
    innerSvg: string;
    transformMatrix?: [number, number, number, number, number, number];
    sourceId?: string;
  };
}

export type ImportedElement =
  | ImportedPathElement
  | ImportedGroupElement
  | ImportedNativeShapeElement
  | ImportedNativeTextElement
  | ImportedImageElement
  | ImportedForeignObjectElement
  | ImportedSymbolInstanceElement
  | ImportedUseElement
  | ImportedEmbeddedSvgElement;

/**
 * SVG dimensions extracted from width, height, and viewBox attributes.
 */
export interface SVGDimensions {
  width: number;
  height: number;
  viewBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ImportedArtboardBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface ImportedArtboardMetadata {
  version: number;
  enabled: boolean;
  selectedPresetId: string | null;
  customWidth: number;
  customHeight: number;
  backgroundColor: string;
  showMargins: boolean;
  marginSize: number;
  exportBounds: ImportedArtboardBounds;
}

/**
 * Import result containing both dimensions and path data.
 */
export interface SVGImportResult {
  dimensions: SVGDimensions;
  paths: PathData[];
  elements: ImportedElement[];
  pluginImports: Record<string, unknown[]>;
  artboardMetadata: ImportedArtboardMetadata | null;
}
