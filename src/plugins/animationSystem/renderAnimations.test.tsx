import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderAnimationsForElement } from './renderAnimations';
import { shouldTriggerBeginElementManually } from './smilTimingUtils';
import type { AnimationState, SVGAnimation } from './types';

type AnimationNodeProps = {
  id?: string;
  begin?: string;
  end?: string;
};

const createAnimationState = (chainDelays: Map<string, number>): AnimationState => ({
  isPlaying: true,
  hasPlayed: true,
  currentTime: 0,
  startTime: null,
  playbackRate: 1,
  restartKey: 0,
  chainDelays,
  isWorkspaceOpen: false,
  isCanvasPreviewMode: false,
  activeGizmos: new Map(),
  focusedGizmoAnimationId: null,
  gizmoEditMode: false,
  draggingHandle: null,
});

describe('renderAnimationsForElement', () => {
  it('preserves imported SMIL chains when no computed chain delay exists', () => {
    const animations: SVGAnimation[] = [
      {
        id: 'anm-first',
        smilId: 'SVGzjrPLenI',
        type: 'animate',
        targetElementId: 'shape-1',
        attributeName: 'x',
        begin: '0;SVGXAURnSRI.end+0.2s',
        dur: '0.6s',
        values: '1;4;1',
      },
      {
        id: 'anm-last',
        smilId: 'SVGXAURnSRI',
        type: 'animate',
        targetElementId: 'shape-1',
        attributeName: 'x',
        begin: 'SVGzjrPLenI.begin+0.4s',
        end: 'SVGzjrPLenI.end+0.2s',
        dur: '0.6s',
        values: '15.66;18.66;15.66',
      },
    ];

    const nodes = renderAnimationsForElement(
      'shape-1',
      animations,
      createAnimationState(new Map<string, number>()),
      animations
    ) as ReactElement<AnimationNodeProps>[];

    expect(nodes).toHaveLength(2);
    expect(nodes[0]?.props.id).toBe('anm-first');
    expect(nodes[0]?.props.begin).toBe('0;anm-last.end+0.2s');
    expect(nodes[1]?.props.id).toBe('anm-last');
    expect(nodes[1]?.props.begin).toBe('anm-first.begin+0.4s');
    expect(nodes[1]?.props.end).toBe('anm-first.end+0.2s');
  });

  it('uses explicit chain delays when they exist', () => {
    const animations: SVGAnimation[] = [
      {
        id: 'anm-first',
        smilId: 'SVGzjrPLenI',
        type: 'animate',
        targetElementId: 'shape-1',
        attributeName: 'x',
        begin: 'SVGXAURnSRI.end+0.2s',
        dur: '0.6s',
        values: '1;4;1',
      },
    ];

    const nodes = renderAnimationsForElement(
      'shape-1',
      animations,
      createAnimationState(new Map<string, number>([['anm-first', 150]])),
      animations
    ) as ReactElement<AnimationNodeProps>[];

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.props.begin).toBe('0.150s');
  });
});

describe('shouldTriggerBeginElementManually', () => {
  it('only forces manual begin for indefinite animations', () => {
    expect(shouldTriggerBeginElementManually('indefinite')).toBe(true);
    expect(shouldTriggerBeginElementManually('0;other.end+0.2s')).toBe(false);
    expect(shouldTriggerBeginElementManually(undefined)).toBe(false);
  });
});
