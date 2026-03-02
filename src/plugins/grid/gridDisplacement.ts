import type { WarpParams } from './slice';

/**
 * Warp normalization base size used as the default period reference
 * for sine and noise displacement calculations.
 */
const WARP_NORMALIZATION_SIZE = 1024;

/** Approximate max radius for radial warp Hann-window normalization. */
const RADIAL_MAX_RADIUS = 500;

// Perlin-like noise frequency/phase multipliers (multi-octave sine approximation)
const NOISE_FREQ_1 = 0.01;
const NOISE_FREQ_2 = 0.02;
const NOISE_FREQ_3 = 0.007;
const NOISE_FREQ_Y_2 = 0.015;
const NOISE_FREQ_Y_3 = 0.009;
const NOISE_SEED_MULT_2 = 1.3;
const NOISE_SEED_MULT_Y_2 = 1.7;
const NOISE_SEED_MULT_3 = 2.1;
const NOISE_SEED_MULT_Y_3 = 2.3;
/** Sum of octave weights (1 + 0.5 + 0.25) used to normalize the noise amplitude. */
const NOISE_WEIGHT_SUM = 1.75;
/** Divisor applied to the final noise displacement to keep it moderate. */
const NOISE_AMPLITUDE_DIVISOR = 3;

/**
 * Calculate displacement field D(x,y) for a given warp configuration.
 * Shared by both the grid slice (snap calculations) and the overlay (rendering).
 */
export function calculateDisplacement(
  x: number,
  y: number,
  warp: WarpParams
): { dx: number; dy: number } {
  switch (warp.kind) {
    case 'sine2d': {
      const phaseX = warp.phaseX ?? 0;
      const phaseY = warp.phaseY ?? 0;
      const dx =
        warp.ampX *
        Math.sin((2 * Math.PI * warp.freqX * x) / WARP_NORMALIZATION_SIZE + phaseX) *
        Math.cos((2 * Math.PI * warp.freqY * y) / WARP_NORMALIZATION_SIZE + phaseY);
      const dy =
        warp.ampY *
        Math.cos((2 * Math.PI * warp.freqX * x) / WARP_NORMALIZATION_SIZE + phaseX) *
        Math.sin((2 * Math.PI * warp.freqY * y) / WARP_NORMALIZATION_SIZE + phaseY);
      return { dx, dy };
    }

    case 'radial': {
      const cx = warp.centerX ?? 0;
      const cy = warp.centerY ?? 0;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Apply swirl if specified
      const swirlTurns = warp.swirlTurns ?? 0;
      const swirlAngle = angle + 2 * Math.PI * swirlTurns * (r / RADIAL_MAX_RADIUS);

      // Radial displacement with Hann window
      const windowFactor = 0.5 * (1 - Math.cos(Math.PI * Math.min(r / RADIAL_MAX_RADIUS, 1)));
      const mag = windowFactor * warp.ampX; // use ampX as magnitude

      return {
        dx: mag * Math.cos(swirlAngle),
        dy: mag * Math.sin(swirlAngle),
      };
    }

    case 'perlin2d': {
      // Simplified Perlin-like noise using multi-octave sine approximation.
      const seed = warp.seed ?? 0;
      const s1 = Math.sin(x * NOISE_FREQ_1 + seed) * Math.cos(y * NOISE_FREQ_1 + seed);
      const s2 =
        Math.sin(x * NOISE_FREQ_2 + seed * NOISE_SEED_MULT_2) *
        Math.cos(y * NOISE_FREQ_Y_2 + seed * NOISE_SEED_MULT_Y_2);
      const s3 =
        Math.sin(x * NOISE_FREQ_3 + seed * NOISE_SEED_MULT_3) *
        Math.cos(y * NOISE_FREQ_Y_3 + seed * NOISE_SEED_MULT_Y_3);

      const noiseX = (s1 + 0.5 * s2 + 0.25 * s3) / NOISE_WEIGHT_SUM;
      const noiseY = (s2 + 0.5 * s3 + 0.25 * s1) / NOISE_WEIGHT_SUM;

      return {
        dx: (warp.ampX * noiseX * warp.freqX) / NOISE_AMPLITUDE_DIVISOR,
        dy: (warp.ampY * noiseY * warp.freqY) / NOISE_AMPLITUDE_DIVISOR,
      };
    }

    default:
      return { dx: 0, dy: 0 };
  }
}
