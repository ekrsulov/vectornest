/**
 * Animation Contribution Registry
 * 
 * Allows plugins to contribute animation elements to SVG export.
 * This maintains decoupling between the animation system and core export logic.
 */

import type { CanvasElement } from '../types';
import type { CanvasStore } from '../store/canvasStore';
import { ContributionRegistry } from './ContributionRegistry';

export interface AnimationContribution {
  id: string;
  /**
   * Serialize animations for a specific element.
   * Returns an array of animation element strings (animate, animateTransform, etc.)
   */
  serializeAnimations: (state: CanvasStore, element: CanvasElement) => string[];
  
  /**
   * Optional: Return extra attributes that should be added to the element for animations to work.
   * For example, pathDraw requires pathLength="1" and stroke-dasharray="1"
   */
  getExtraAttributes?: (state: CanvasStore, element: CanvasElement) => Record<string, string>;
}

class AnimationContributionRegistry extends ContributionRegistry<AnimationContribution> {
  /**
   * Serialize all animations for a given element from all registered contributions.
   * Returns a single string with all animation elements concatenated.
   */
  serializeAnimationsForElement(state: CanvasStore, element: CanvasElement): string {
    const parts: string[] = [];
    
    this.contributions.forEach((contribution) => {
      const animations = contribution.serializeAnimations(state, element);
      parts.push(...animations);
    });

    return parts.join('\n');
  }

  /**
   * Check if any animations exist for a given element.
   */
  hasAnimationsForElement(state: CanvasStore, element: CanvasElement): boolean {
    return this.contributions.some((contribution) => {
      const animations = contribution.serializeAnimations(state, element);
      return animations.length > 0;
    });
  }

  /**
   * Get extra attributes that should be added to an element for animations to work.
   * Merges attributes from all contributions.
   */
  getExtraAttributesForElement(state: CanvasStore, element: CanvasElement): Record<string, string> {
    const attrs: Record<string, string> = {};
    
    this.contributions.forEach((contribution) => {
      if (contribution.getExtraAttributes) {
        const extra = contribution.getExtraAttributes(state, element);
        Object.assign(attrs, extra);
      }
    });

    return attrs;
  }
}

export const animationContributionRegistry = new AnimationContributionRegistry();
