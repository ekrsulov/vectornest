/**
 * AnimationCard — Wrapper that injects canvas elements into the shared AnimationCard.
 */

import React from 'react';
import { useCanvasStore } from '../../../store/canvasStore';
import { AnimationCard as SharedAnimationCard } from '../../../ui/AnimationCard';
import type { AnimationCardProps as SharedProps } from '../../../ui/AnimationCard';

type AnimationCardProps = Omit<SharedProps, 'elements'>;

export const AnimationCard: React.FC<AnimationCardProps> = (props) => {
    const elements = useCanvasStore(state => state.elements);
    return <SharedAnimationCard {...props} elements={elements} />;
};
