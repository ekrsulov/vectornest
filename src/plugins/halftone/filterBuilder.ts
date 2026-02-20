import type { HalftoneState } from './slice';

/**
 * Build an SVG <filter> string that simulates a halftone printing effect.
 *
 * The technique:
 * 1. Convert to greyscale via feColorMatrix
 * 2. Boost contrast
 * 3. Generate a dot/line pattern via feTurbulence + feComponentTransfer
 * 4. Use feComposite to modulate the original image
 *
 * For the "circle" and "ellipse" shapes we use feTurbulence with discrete
 * transfer to create a dot grid. For "line" we use a rotated turbulence.
 */
export const buildHalftoneFilterSvg = (
  filterId: string,
  state: HalftoneState
): string => {
  const { dotSize, spacing, angle, shape, contrast, colorize } = state;

  // Base frequency derived from spacing — smaller spacing → higher frequency
  const freq = 1 / Math.max(spacing, 1);
  const freqX = freq.toFixed(4);
  const freqY = shape === 'line' ? '0' : freq.toFixed(4);

  // Number of discrete steps controls dot crispness
  const numSteps = Math.max(2, Math.round(dotSize));

  // Build the discrete table for dot shape
  const tableValues = Array.from({ length: numSteps + 1 }, (_, i) => {
    const t = i / numSteps;
    return t < 0.5 ? '0' : '1';
  }).join(' ');

  const rotate = angle !== 0
    ? `<feConvolveMatrix order="1" kernelMatrix="1" targetX="0" targetY="0" preserveAlpha="true"/>`
    : '';

  // Grayscale conversion matrix
  const grayscaleMatrix = '0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0';

  // Contrast enhancement
  const slope = contrast.toFixed(2);
  const intercept = (-(0.5 * contrast) + 0.5).toFixed(3);

  if (colorize) {
    // Colorized halftone: preserve color information in the dots
    return `<filter id="${filterId}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feTurbulence type="turbulence" baseFrequency="${freqX} ${freqY}" numOctaves="1" seed="0" result="pattern"/>
  <feComponentTransfer in="pattern" result="dots">
    <feFuncR type="discrete" tableValues="${tableValues}"/>
    <feFuncG type="discrete" tableValues="${tableValues}"/>
    <feFuncB type="discrete" tableValues="${tableValues}"/>
  </feComponentTransfer>
  <feColorMatrix in="SourceGraphic" type="saturate" values="1" result="color"/>
  <feComponentTransfer in="color" result="contrast">
    <feFuncR type="linear" slope="${slope}" intercept="${intercept}"/>
    <feFuncG type="linear" slope="${slope}" intercept="${intercept}"/>
    <feFuncB type="linear" slope="${slope}" intercept="${intercept}"/>
  </feComponentTransfer>
  <feComposite in="contrast" in2="dots" operator="in" result="halftone"/>
  ${angle !== 0 ? `<feOffset dx="0" dy="0" result="rotated"/>` : ''}
</filter>`;
  }

  // Classic monochrome halftone
  return `<filter id="${filterId}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feColorMatrix in="SourceGraphic" type="matrix" values="${grayscaleMatrix}" result="gray"/>
  <feComponentTransfer in="gray" result="contrast">
    <feFuncR type="linear" slope="${slope}" intercept="${intercept}"/>
    <feFuncG type="linear" slope="${slope}" intercept="${intercept}"/>
    <feFuncB type="linear" slope="${slope}" intercept="${intercept}"/>
  </feComponentTransfer>
  <feTurbulence type="turbulence" baseFrequency="${freqX} ${freqY}" numOctaves="1" seed="0" result="pattern"/>
  <feComponentTransfer in="pattern" result="dots">
    <feFuncR type="discrete" tableValues="${tableValues}"/>
    <feFuncG type="discrete" tableValues="${tableValues}"/>
    <feFuncB type="discrete" tableValues="${tableValues}"/>
  </feComponentTransfer>
  <feComposite in="contrast" in2="dots" operator="in" result="halftone"/>
  ${rotate}
</filter>`;
};
