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
