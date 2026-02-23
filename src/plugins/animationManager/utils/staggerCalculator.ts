/**
 * Stagger Calculator — Computes incremental delay offsets for multi-element
 * animation choreography (stagger, sequential chain).
 */

import type { SVGAnimation } from '../../animationSystem/types';

/**
 * Compute stagger delays for a list of element IDs.
 * Each element gets an incrementing delay based on its index.
 *
 * @param elementIds - Ordered element IDs
 * @param interval - Delay between each element in seconds
 * @returns Map of elementId → delay in seconds
 */
export function computeStaggerDelays(
  elementIds: string[],
  interval: number,
): Map<string, number> {
  const delays = new Map<string, number>();
  elementIds.forEach((id, index) => {
    delays.set(id, index * interval);
  });
  return delays;
}

/**
 * Compute sequential chain delays where each element's animations
 * start after the previous element's longest animation ends.
 *
 * @param elementIds - Ordered element IDs
 * @param animations - All animations
 * @returns Map of animationId → delay in milliseconds
 */
export function computeSequentialChainDelays(
  elementIds: string[],
  animations: SVGAnimation[],
): Map<string, number> {
  const delays = new Map<string, number>();
  let accumulatedDelay = 0;

  for (const elementId of elementIds) {
    // Find all animations for this element
    const elementAnims = animations.filter(
      (a) => a.targetElementId === elementId,
    );

    // Set delay for all of this element's animations
    for (const anim of elementAnims) {
      delays.set(anim.id, accumulatedDelay * 1000); // Convert to ms
    }

    // Find the longest animation duration for this element
    let maxDuration = 0;
    for (const anim of elementAnims) {
      const durSec =
        parseFloat(String(anim.dur ?? '0').replace('s', '')) || 0;
      const repeat =
        anim.repeatCount === 'indefinite'
          ? 1 // Treat indefinite as 1 iteration for chaining
          : typeof anim.repeatCount === 'number'
            ? anim.repeatCount
            : 1;
      const total = durSec * repeat;
      if (total > maxDuration) maxDuration = total;
    }

    accumulatedDelay += maxDuration;
  }

  return delays;
}
