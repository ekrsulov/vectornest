import React from 'react';
import type { AnimationState, SVGAnimation } from './types';
import { ensureChainDelays } from './chainUtils';

const formatBegin = (animation: SVGAnimation, animationState?: AnimationState): string | undefined => {
  if (!animationState) {
    return animation.begin ?? '0s';
  }
  const delays: Map<string, number> = ensureChainDelays(animationState.chainDelays);
  const delayMs = delays.get(animation.id) ?? 0;
  return `${(delayMs / 1000).toFixed(3)}s`;
};

export const renderAnimationsForElement = (
  elementId: string,
  animations: SVGAnimation[],
  animationState?: AnimationState
): React.ReactNode[] => {
  const allowRender = animationState
    ? (animationState.isPlaying || animationState.hasPlayed || animationState.isWorkspaceOpen)
    : true;
  if (!allowRender) return [];
  const elementAnimations = animations.filter((anim) => {
    const matchesDirect = anim.targetElementId === elementId && !anim.clipPathTargetId;
    const matchesDef =
      anim.gradientTargetId === elementId ||
      anim.patternTargetId === elementId ||
      anim.clipPathTargetId === elementId ||
      anim.filterTargetId === elementId ||
      anim.maskTargetId === elementId ||
      anim.markerTargetId === elementId ||
      anim.symbolTargetId === elementId;
    return matchesDirect || matchesDef;
  });

  const uniqueAnimations: SVGAnimation[] = [];
  const seen = new Set<string>();
  elementAnimations.forEach((animation) => {
    const key = `${animation.id}:${animation.attributeName ?? ''}:${animation.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueAnimations.push(animation);
  });

  const nodes: React.ReactNode[] = [];

  uniqueAnimations.forEach((animation) => {
    const beginValue = animationState ? formatBegin(animation, animationState) : animation.begin ?? '0s';
    const restartKey = animationState?.restartKey ?? 0;
    const commonProps = {
      dur: animation.dur ?? '2s',
      begin: beginValue,
      end: animation.end,
      fill: animation.fill ?? 'freeze',
      repeatCount: animation.repeatCount ?? 1,
      repeatDur: animation.repeatDur,
      calcMode: animation.calcMode ?? 'linear',
      keyTimes: animation.keyTimes,
      keySplines: animation.keySplines,
    };

    switch (animation.type) {
      case 'animate':
        nodes.push(
          <animate
            key={`${animation.id}-${restartKey}`}
            {...commonProps}
            attributeName={animation.attributeName}
            values={animation.values}
            from={animation.from}
            to={animation.to}
            additive={animation.additive ?? 'replace'}
            accumulate={animation.accumulate ?? 'none'}
          />
        );
        break;
      case 'animateTransform':
        nodes.push(
          <animateTransform
            key={`${animation.id}-${restartKey}`}
            {...commonProps}
            attributeName={animation.attributeName}
            type={animation.transformType}
            values={animation.values}
            from={animation.from}
            to={animation.to}
            additive={animation.additive ?? 'replace'}
            accumulate={animation.accumulate ?? 'none'}
          />
        );
        break;
      case 'animateMotion':
        nodes.push(
          <animateMotion
            key={`${animation.id}-${restartKey}`}
            {...commonProps}
            path={animation.mpath ? undefined : animation.path}
            rotate={animation.rotate ?? 'auto'}
            keyPoints={animation.keyPoints}
          >
            {animation.mpath ? <mpath href={`#${animation.mpath}`} /> : null}
          </animateMotion>
        );
        break;
      case 'set':
        nodes.push(
          <set
            key={`${animation.id}-${restartKey}`}
            {...commonProps}
            attributeName={animation.attributeName}
            to={animation.to}
          />
        );
        break;
      default:
        break;
    }
  });

  return nodes;
};

/**
 * Returns initial attribute overrides for idle states.
 * We intentionally return no overrides so elements stay unchanged until playback starts.
 */
export const getInitialAnimationAttributes = (
  _elementId: string,
  _animations: SVGAnimation[],
  animationState?: AnimationState
): Record<string, string | number | undefined> => {
  // In idle/stop state, do not apply any animation-driven attribute overrides.
  if (!animationState?.isPlaying && !animationState?.hasPlayed) return {};
  return {};
};
