import React from 'react';
import type { SVGAnimation } from '../animationSystem/types';
import type { TextEffectRenderLayer } from './types';

export const TEXT_EFFECT_LAYERS_METADATA_KEY = 'textEffectLayers';
export const TEXT_EFFECT_BASE_ANIMATIONS_METADATA_KEY = 'textEffectBaseAnimations';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value)
);

const coerceAnimation = (
  value: unknown,
): Omit<SVGAnimation, 'id' | 'targetElementId'> | null => {
  if (!isRecord(value)) return null;
  const type = value.type;
  if (
    type !== 'animate' &&
    type !== 'animateTransform' &&
    type !== 'animateMotion' &&
    type !== 'set'
  ) {
    return null;
  }

  return value as Omit<SVGAnimation, 'id' | 'targetElementId'>;
};

export const getTextEffectLayersFromMetadata = (metadata: unknown): TextEffectRenderLayer[] => {
  if (!isRecord(metadata)) return [];
  const rawLayers = metadata[TEXT_EFFECT_LAYERS_METADATA_KEY];
  if (!Array.isArray(rawLayers)) return [];

  return rawLayers
    .map((layer) => {
      if (!isRecord(layer)) return null;
      return {
        ...layer,
        offsetX: typeof layer.offsetX === 'number' ? layer.offsetX : 0,
        offsetY: typeof layer.offsetY === 'number' ? layer.offsetY : 0,
        animations: Array.isArray(layer.animations)
          ? layer.animations
            .map(coerceAnimation)
            .filter((animation): animation is Omit<SVGAnimation, 'id' | 'targetElementId'> => Boolean(animation))
          : undefined,
      } as TextEffectRenderLayer;
    })
    .filter((layer): layer is TextEffectRenderLayer => Boolean(layer));
};

export const getTextEffectBaseAnimationsFromMetadata = (
  metadata: unknown,
): Array<Omit<SVGAnimation, 'id' | 'targetElementId'>> => {
  if (!isRecord(metadata)) return [];
  const rawAnimations = metadata[TEXT_EFFECT_BASE_ANIMATIONS_METADATA_KEY];
  if (!Array.isArray(rawAnimations)) return [];

  return rawAnimations
    .map(coerceAnimation)
    .filter((animation): animation is Omit<SVGAnimation, 'id' | 'targetElementId'> => Boolean(animation));
};

export const renderInlineTextEffectAnimations = (
  animations: Array<Omit<SVGAnimation, 'id' | 'targetElementId'>> | undefined,
  keyPrefix: string,
  restartKey: number,
): React.ReactNode[] => {
  if (!animations?.length) return [];

  return animations.map((animation, index) => {
    const commonProps = {
      dur: animation.dur ?? '2s',
      begin: animation.begin ?? '0s',
      end: animation.end,
      fill: animation.fill ?? 'freeze',
      repeatCount: animation.repeatCount ?? 1,
      repeatDur: animation.repeatDur,
      calcMode: animation.calcMode ?? 'linear',
      keyTimes: animation.keyTimes,
      keySplines: animation.keySplines,
    };
    const key = `${keyPrefix}-${index}-${restartKey}`;

    switch (animation.type) {
      case 'animate':
        return (
          <animate
            key={key}
            {...commonProps}
            attributeName={animation.attributeName}
            values={animation.values}
            from={animation.from}
            to={animation.to}
            additive={animation.additive ?? 'replace'}
            accumulate={animation.accumulate ?? 'none'}
          />
        );
      case 'animateTransform':
        return (
          <animateTransform
            key={key}
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
      case 'animateMotion':
        return (
          <animateMotion
            key={key}
            {...commonProps}
            path={animation.mpath ? undefined : animation.path}
            rotate={animation.rotate ?? 'auto'}
            keyPoints={animation.keyPoints}
          >
            {animation.mpath ? <mpath href={`#${animation.mpath}`} /> : null}
          </animateMotion>
        );
      case 'set':
        return (
          <set
            key={key}
            {...commonProps}
            attributeName={animation.attributeName}
            to={animation.to}
          />
        );
      default:
        return null;
    }
  });
};
