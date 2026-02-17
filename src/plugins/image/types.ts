import type { CanvasElementBase } from '../../types';
import type { SubPath } from '../../types';

export type ImageElement = CanvasElementBase<'image', {
  x: number;
  y: number;
  width: number;
  height: number;
  href: string;
  preserveAspectRatio?: string;
  opacity?: number;
  filterId?: string;
  clipPathId?: string;
  clipPathTemplateId?: string;
  maskId?: string;
  sourceId?: string;
  subPaths?: SubPath[];
  strokeWidth?: number;
  childIds?: string[];
  isHidden?: boolean;
  isLocked?: boolean;
  name?: string;
  transformMatrix?: [number, number, number, number, number, number];
  transform?: {
    translateX: number;
    translateY: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
}>;

export type { ImageElement as PluginImageElement };
