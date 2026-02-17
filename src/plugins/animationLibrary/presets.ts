/**
 * Animation Presets - Proxy file
 * 
 * This file re-exports all presets from the modular structure in ./presets/
 * The presets are organized by animation target type:
 * - generalPresets.ts: Animations for any element (Pulse, Fade, Bounce, etc.)
 * - pathPresets.ts: Path-specific animations (Draw, Stroke Pulse)
 * - textPresets.ts: Text-specific animations (Typewriter, Glow, Wave, etc.)
 */

export * from './presets/index';
