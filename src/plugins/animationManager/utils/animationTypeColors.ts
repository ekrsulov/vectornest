import type { SVGAnimation } from '../../animationSystem/types';

type AnimationTypeTone = {
  bg: string;
  color: string;
};

const DEFAULT_TONE: AnimationTypeTone = {
  bg: '#63B3ED',
  color: '#111827',
};

const TYPE_TONES: Partial<Record<SVGAnimation['type'], AnimationTypeTone>> = {
  animate: {
    bg: '#63B3ED',
    color: '#111827',
  },
  animateTransform: {
    bg: '#9F7AEA',
    color: '#FFFFFF',
  },
  animateMotion: {
    bg: '#F6AD55',
    color: '#111827',
  },
  set: {
    bg: '#68D391',
    color: '#111827',
  },
  custom: {
    bg: '#FC8181',
    color: '#111827',
  },
};

export const ANIMATION_TYPE_BAR_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_TONES).map(([type, tone]) => [type, tone?.bg ?? DEFAULT_TONE.bg]),
);

export function getAnimationTypeTone(type: SVGAnimation['type']): AnimationTypeTone {
  return TYPE_TONES[type] ?? DEFAULT_TONE;
}
