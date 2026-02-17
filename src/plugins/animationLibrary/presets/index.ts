/**
 * Animation Presets - Barrel file
 * Re-exports all presets from modular files
 */

// General presets (any element type)
export {
    PULSE_PRESET,
    FADE_IN_PRESET,
    BREATHING_PRESET,
    HEARTBEAT_PRESET,
    FLOAT_PRESET,
    SWING_PRESET,
    SPIN_PRESET,
    SPIN_CCW_PRESET,
    SHAKE_PRESET,
    SHAKE_HARD_PRESET,
    BOUNCE_PRESET,
    WOBBLE_PRESET,
    GENERAL_PRESETS,
} from './generalPresets';

// Entrance/Exit presets (any element type)
export {
    FADE_OUT_PRESET,
    POP_IN_PRESET,
    POP_OUT_PRESET,
    SLIDE_IN_LEFT_PRESET,
    SLIDE_IN_RIGHT_PRESET,
    SLIDE_OUT_LEFT_PRESET,
    SLIDE_OUT_RIGHT_PRESET,
    SLIDE_IN_TOP_PRESET,
    SLIDE_IN_BOTTOM_PRESET,
    SLIDE_OUT_TOP_PRESET,
    SLIDE_OUT_BOTTOM_PRESET,
    ENTRANCE_EXIT_PRESETS,
} from './entranceExitPresets';

// Transform presets (any element type)
export {
    FLIP_X_PRESET,
    FLIP_Y_PRESET,
    FLIP_3D_PRESET,
    SKEW_LOOP_PRESET,
    SKEW_SHAKE_PRESET,
    TILT_PRESET,
    PENDULUM_PRESET,
    RINGING_BELL_PRESET,
    VIBRATE_PRESET,
    JELLO_X_PRESET,
    JELLO_Y_PRESET,
    WIGGLE_PRESET,
    TADA_PRESET,
    TRANSFORM_PRESETS,
} from './transformPresets';

// Special entrance/exit presets (any element type)
export {
    ROLL_IN_PRESET,
    ROLL_OUT_PRESET,
    EXPAND_WIDTH_PRESET,
    EXPAND_HEIGHT_PRESET,
    EXPAND_BOTH_PRESET,
    VANISH_PRESET,
    MELT_DOWN_PRESET,
    EVAPORATE_UP_PRESET,
    DOOR_OPEN_PRESET,
    DOOR_CLOSE_PRESET,
    SPECIAL_PRESETS,
} from './specialPresets';

// Decorative loop presets (any element type)
export {
    BLINK_PRESET,
    FLASH_PRESET,
    STROBE_PRESET,
    SHIMMER_PRESET,
    STAR_TWINKLE_PRESET,
    GLITCH_PRESET,
    GLITCH_EXTREME_PRESET,
    WAVE_PRESET,
    CLOUD_DRIFT_PRESET,
    WIND_SWAY_PRESET,
    FLAME_PULSE_PRESET,
    LOOP_PRESETS,
} from './loopPresets';

// Path presets (path elements only)
export {
    PATH_DRAW_PRESET,
    PATH_DRAW_SLOW_PRESET,
    STROKE_WIDTH_PULSE_PRESET,
    DASH_MARCH_PRESET,
    DASH_CYCLE_PRESET,
    PATH_PRESETS,
} from './pathPresets';

// Color presets (any element type)
export {
    RAINBOW_FILL_PRESET,
    RAINBOW_STROKE_PRESET,
    COLOR_FLASH_RED_PRESET,
    COLOR_FLASH_WHITE_PRESET,
    OPACITY_PULSE_PRESET,
    FILL_FADE_PULSE_PRESET,
    STROKE_FADE_PULSE_PRESET,
    SYNTHWAVE_COLOR_PRESET,
    COLOR_PRESETS,
} from './colorPresets';

// Filter presets (any element type)
export {
    BLUR_PULSE_PRESET,
    GLOW_PULSE_PRESET,
    SHADOW_PULSE_PRESET,
    GRAYSCALE_PULSE_PRESET,
    SEPIA_PULSE_PRESET,
    HUE_ROTATE_PRESET,
    BRIGHTNESS_FLASH_PRESET,
    CONTRAST_PULSE_PRESET,
    INVERT_FLASH_PRESET,
    TURBULENCE_RIPPLE_PRESET,
    FILTER_PRESETS,
} from './filterPresets';

// Text presets (text elements only)
export {
    TEXT_TYPEWRITER_PRESET,
    TEXT_GLOW_PRESET,
    TEXT_WAVE_PRESET,
    TEXT_JITTER_PRESET,
    TEXT_ZOOM_PRESET,
    TEXT_SLIDE_PRESET,
    TEXT_FLASH_PRESET,
    TEXT_RISE_PRESET,
    TEXT_TILT_PRESET,
    TEXT_POP_PRESET,
    TEXT_WEIGHT_SHIFT_PRESET,
    TEXT_SPACING_PRESET,
    TEXT_SIZE_PULSE_PRESET,
    TEXT_LETTER_ROTATE_PRESET,
    TEXT_PRESETS,
} from './textPresets';

// Advanced presets (any element type)
export {
    ELASTIC_BOUNCE_PRESET,
    SQUASH_BOUNCE_PRESET,
    ORBIT_PRESET,
    SPIRAL_PRESET,
    RUBBER_BAND_PRESET,
    BREATHING_GLOW_PRESET,
    MORPH_SCALE_PRESET,
    ADVANCED_PRESETS,
} from './advancedPresets';

// Re-export AnimationPreset type for convenience
export type { AnimationPreset } from '../types';

// Default presets array combining all categories
import { GENERAL_PRESETS } from './generalPresets';
import { ENTRANCE_EXIT_PRESETS } from './entranceExitPresets';
import { TRANSFORM_PRESETS } from './transformPresets';
import { SPECIAL_PRESETS } from './specialPresets';
import { LOOP_PRESETS } from './loopPresets';
import { PATH_PRESETS } from './pathPresets';
import { COLOR_PRESETS } from './colorPresets';
import { FILTER_PRESETS } from './filterPresets';
import { TEXT_PRESETS } from './textPresets';
import { ADVANCED_PRESETS } from './advancedPresets';
import type { AnimationPreset } from '../types';

export const DEFAULT_PRESETS: AnimationPreset[] = [
    ...GENERAL_PRESETS,
    ...ENTRANCE_EXIT_PRESETS,
    ...TRANSFORM_PRESETS,
    ...SPECIAL_PRESETS,
    ...LOOP_PRESETS,
    ...PATH_PRESETS,
    ...COLOR_PRESETS,
    ...FILTER_PRESETS,
    ...TEXT_PRESETS,
    ...ADVANCED_PRESETS,
];
