export type StrokeLinecap = 'butt' | 'round' | 'square';
export type StrokeLinejoin = 'miter' | 'round' | 'bevel';
export type FillRule = 'nonzero' | 'evenodd';

export interface StrokeProperties {
  strokeWidth: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeLinecap?: StrokeLinecap;
  strokeLinejoin?: StrokeLinejoin;
  strokeMiterlimit?: number;
  strokeDasharray?: string;
  strokeDashoffset?: number;
  /** SVG pathLength attribute — allows declaring the total length of the path for dash calculations. */
  pathLength?: number;
}

export interface FillProperties {
  fillColor: string;
  fillOpacity: number;
  fillRule?: FillRule;
}

export type StrokePropertiesOptional = Partial<StrokeProperties>;
export type FillPropertiesOptional = Partial<FillProperties>;

export type CoreStyleProperties =
  Pick<StrokeProperties, 'strokeWidth' | 'strokeColor' | 'strokeOpacity'> &
  Pick<FillProperties, 'fillColor' | 'fillOpacity'>;

export type GlobalStyleProperties =
  CoreStyleProperties &
  Required<Pick<StrokeProperties, 'strokeLinecap' | 'strokeLinejoin' | 'strokeDasharray'>> &
  Required<Pick<FillProperties, 'fillRule'>> & {
    opacity: number;
  };

export type CopiedStyleProperties =
  CoreStyleProperties &
  Pick<StrokeProperties, 'strokeLinecap' | 'strokeLinejoin' | 'strokeDasharray'> &
  Pick<FillProperties, 'fillRule'> & {
    opacity: number;
  };
