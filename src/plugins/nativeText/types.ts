import type { CanvasElementBase } from '../../types';

export type WritingMode =
  | 'horizontal-tb'
  | 'vertical-rl'
  | 'vertical-lr'
  | 'sideways-rl'
  | 'sideways-lr'
  | 'lr'
  | 'rl'
  | 'tb'
  | 'tb-rl'
  | 'tb-lr';

export type NativeTextElement = CanvasElementBase<'nativeText', {
  x: number;
  y: number;
  text: string;
  richText?: string;
  spans?: Array<{
    text: string;
    line: number;
    fontWeight?: string;
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline' | 'line-through';
    fontSize?: number;
    fillColor?: string;
    dx?: string;
  }>;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  fillColor: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  strokeLinecap?: 'butt' | 'round' | 'square';
  strokeLinejoin?: 'miter' | 'round' | 'bevel';
  strokeDasharray?: string;
  textAnchor?: 'start' | 'middle' | 'end';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  writingMode?: WritingMode;
  letterSpacing?: number;
  wordSpacing?: number;
  lengthAdjust?: 'spacing' | 'spacingAndGlyphs';
  textLength?: number;
  dominantBaseline?: 'alphabetic' | 'middle' | 'hanging' | 'ideographic';
  direction?: 'ltr' | 'rtl';
  unicodeBidi?: 'normal' | 'embed' | 'bidi-override' | 'isolate' | 'plaintext';
  rotate?: number[];
  lineHeight?: number;
  filterId?: string;
  clipPathId?: string;
  clipPathTemplateId?: string;
  maskId?: string;
  opacity?: number;
  mixBlendMode?: string;
  isolation?: 'auto' | 'isolate';
  sourceId?: string;
  transformMatrix?: [number, number, number, number, number, number];
  transform?: {
    translateX?: number;
    translateY?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
  };
}>;
