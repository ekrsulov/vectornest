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
  { label: 'Ease In Cubic', value: 'ease-in-cubic', points: [0.55, 0.055, 0.675, 0.19] },
  { label: 'Ease Out Cubic', value: 'ease-out-cubic', points: [0.215, 0.61, 0.355, 1] },
  { label: 'Ease In Out Cubic', value: 'ease-in-out-cubic', points: [0.645, 0.045, 0.355, 1] },
  { label: 'Bounce Out', value: 'bounce', points: [0.34, 1.56, 0.64, 1] },
  { label: 'Elastic', value: 'elastic', points: [0.68, -0.55, 0.265, 1.55] },
  { label: 'Back In', value: 'back-in', points: [0.6, -0.28, 0.735, 0.045] },
  { label: 'Back Out', value: 'back-out', points: [0.175, 0.885, 0.32, 1.275] },
];
