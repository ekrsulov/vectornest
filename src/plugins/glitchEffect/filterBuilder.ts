import type { GlitchEffectState, GlitchMode } from './slice';

/**
 * Build SVG filter markup for the selected glitch mode.
 */
export function buildGlitchFilterSvg(filterId: string, state: GlitchEffectState): string {
  switch (state.mode) {
    case 'displacement':
      return buildDisplacementFilter(filterId, state);
    case 'rgb-shift':
      return buildRgbShiftFilter(filterId, state);
    case 'scanlines':
      return buildScanlinesFilter(filterId, state);
    case 'pixelate':
      return buildPixelateFilter(filterId, state);
    case 'noise':
      return buildNoiseFilter(filterId, state);
  }
}

/**
 * Get a human label for the glitch mode.
 */
export function getGlitchModeLabel(mode: GlitchMode): string {
  const labels: Record<GlitchMode, string> = {
    displacement: 'Displacement',
    'rgb-shift': 'RGB Shift',
    scanlines: 'Scanlines',
    pixelate: 'Pixelate',
    noise: 'Noise',
  };
  return labels[mode];
}

function buildDisplacementFilter(id: string, state: GlitchEffectState): string {
  return `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
  <feTurbulence type="turbulence" baseFrequency="${state.frequency}" numOctaves="3" seed="${state.seed}" result="turbulence"/>
  <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="${state.intensity}" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
</filter>`;
}

function buildRgbShiftFilter(id: string, state: GlitchEffectState): string {
  return `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <!-- Red channel shifted -->
  <feOffset in="SourceGraphic" dx="${state.shiftX}" dy="${state.shiftY}" result="redShift"/>
  <feColorMatrix in="redShift" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
  <!-- Green channel (original position) -->
  <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
  <!-- Blue channel shifted opposite -->
  <feOffset in="SourceGraphic" dx="${-state.shiftX}" dy="${-state.shiftY}" result="blueShift"/>
  <feColorMatrix in="blueShift" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
  <!-- Combine channels -->
  <feBlend in="red" in2="green" mode="screen" result="rg"/>
  <feBlend in="rg" in2="blue" mode="screen"/>
</filter>`;
}

function buildScanlinesFilter(id: string, state: GlitchEffectState): string {
  // Create horizontal scanlines using turbulence + threshold
  const freq = 1 / state.scanlineGap;
  const alpha = state.intensity / 100;
  return `<filter id="${id}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="turbulence" baseFrequency="0 ${freq}" numOctaves="1" seed="${state.seed}" result="lines"/>
  <feComponentTransfer in="lines" result="thresholdLines">
    <feFuncR type="discrete" tableValues="0 1"/>
    <feFuncG type="discrete" tableValues="0 1"/>
    <feFuncB type="discrete" tableValues="0 1"/>
    <feFuncA type="table" tableValues="${alpha} ${1 - alpha}"/>
  </feComponentTransfer>
  <feComposite in="SourceGraphic" in2="thresholdLines" operator="in"/>
</filter>`;
}

function buildPixelateFilter(id: string, state: GlitchEffectState): string {
  // Pixelation via mosaic approach — downsample then upsample
  const pixelSize = Math.max(1, Math.round(state.intensity / 5));
  return `<filter id="${id}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feFlood flood-color="transparent" result="bg"/>
  <feMorphology in="SourceGraphic" operator="dilate" radius="${pixelSize}" result="dilated"/>
  <feMorphology in="dilated" operator="erode" radius="${pixelSize}" result="pixelated"/>
</filter>`;
}

function buildNoiseFilter(id: string, state: GlitchEffectState): string {
  return `<filter id="${id}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${state.frequency}" numOctaves="4" seed="${state.seed}" result="noise"/>
  <feColorMatrix in="noise" type="saturate" values="0" result="grayNoise"/>
  <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay"/>
</filter>`;
}
