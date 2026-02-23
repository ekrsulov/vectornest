/** Cubic bezier control points [x1, y1, x2, y2] */
export type CubicBezierPoints = [number, number, number, number];

/** Easing preset definition */
export interface EasingPreset {
  label: string;
  value: string;
  points: CubicBezierPoints;
}

/** Common easing presets covering CSS standard and animation-friendly curves */
export const EASING_PRESETS: EasingPreset[] = [
  { label: 'Linear', value: 'linear', points: [0, 0, 1, 1] },
  { label: 'Ease', value: 'ease', points: [0.25, 0.1, 0.25, 1] },
  { label: 'Ease In', value: 'ease-in', points: [0.42, 0, 1, 1] },
  { label: 'Ease Out', value: 'ease-out', points: [0, 0, 0.58, 1] },
  { label: 'Ease In Out', value: 'ease-in-out', points: [0.42, 0, 0.58, 1] },
  { label: 'Ease In Sine', value: 'ease-in-sine', points: [0.12, 0, 0.39, 0] },
  { label: 'Ease Out Sine', value: 'ease-out-sine', points: [0.61, 1, 0.88, 1] },
  { label: 'Ease In Out Sine', value: 'ease-in-out-sine', points: [0.37, 0, 0.63, 1] },
  { label: 'Ease In Quad', value: 'ease-in-quad', points: [0.11, 0, 0.5, 0] },
  { label: 'Ease Out Quad', value: 'ease-out-quad', points: [0.5, 1, 0.89, 1] },
  { label: 'Ease In Cubic', value: 'ease-in-cubic', points: [0.55, 0.055, 0.675, 0.19] },
  { label: 'Ease Out Cubic', value: 'ease-out-cubic', points: [0.215, 0.61, 0.355, 1] },
  { label: 'Ease In Out Cubic', value: 'ease-in-out-cubic', points: [0.645, 0.045, 0.355, 1] },
  { label: 'Ease In Quart', value: 'ease-in-quart', points: [0.5, 0, 0.75, 0] },
  { label: 'Ease Out Quart', value: 'ease-out-quart', points: [0.25, 1, 0.5, 1] },
  { label: 'Ease In Out Quart', value: 'ease-in-out-quart', points: [0.76, 0, 0.24, 1] },
];
