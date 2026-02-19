import type { CanvasElement, PathElement } from '../../types';
import type { CanvasRenderContext } from '../../canvas/renderers';
import { registerRendererExtension } from '../../canvas/renderers/rendererExtensionRegistry';
import { getInitialAnimationAttributes, renderAnimationsForElement } from './renderAnimations';
import type { AnimationState, SVGAnimation } from './types';

const resolveAnimations = (context: CanvasRenderContext): { animations: SVGAnimation[]; animationState: AnimationState | undefined } => {
  const animations = (context.extensionsContext as Record<string, unknown> | undefined)?.animations ?? context.animations;
  const animationState = (context.extensionsContext as Record<string, unknown> | undefined)?.animationState ?? context.animationState;
  return {
    animations: (animations as SVGAnimation[]) ?? [],
    animationState: animationState as AnimationState | undefined,
  };
};

const isPathElement = (element: CanvasElement): element is PathElement => element.type === 'path';

const animationRendererExtension = {
  pluginId: 'animation',
  priority: 100,
  getElementAttributes: (element: CanvasElement, context: CanvasRenderContext) => {
    const { animations, animationState } = resolveAnimations(context);
    const initialAttrs = getInitialAnimationAttributes(element.id, animations, animationState);

    if (isPathElement(element)) {
      const pathData = element.data;
      const pathAnimations = animations ?? [];
      const hasPathDraw = pathAnimations.some(
        (anim) => anim.targetElementId === element.id && anim.attributeName === 'stroke-dashoffset'
      );
      const hasDash = Boolean(
        pathData.strokeDasharray && pathData.strokeDasharray !== 'none'
      );

      const pathDrawAttrs = hasPathDraw && !hasDash
        ? {
          ...(pathData.pathLength !== undefined ? { pathLength: pathData.pathLength } : { pathLength: 1 }),
          ...(pathData.strokeDasharray && pathData.strokeDasharray !== 'none'
            ? {}
            : { strokeDasharray: 1 }),
          strokeDashoffset: initialAttrs.strokeDashoffset ?? pathData.strokeDashoffset ?? '0',
        }
        : {};

      return {
        ...initialAttrs,
        ...pathDrawAttrs,
      };
    }

    return initialAttrs;
  },
  getElementChildren: (element: CanvasElement, context: CanvasRenderContext) => {
    const { animations, animationState } = resolveAnimations(context);
    return renderAnimationsForElement(element.id, animations, animationState);
  },
};

registerRendererExtension(animationRendererExtension);
