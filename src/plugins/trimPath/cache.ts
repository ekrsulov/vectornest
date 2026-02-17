import type { PathElement } from '../../types';
import type { SplitPathResult, TrimSegment, TrimIntersection } from './trimPath';
import {
  validatePathsForTrim,
  computePathIntersections,
  splitPathsByIntersections,
} from './trimPathGeometry';

/**
 * Cache for trim path intersection computations.
 * This cache is explicitly managed and refreshed when selections or paths change.
 */
class TrimPathCache {
  private cachedResult: SplitPathResult | null = null;
  private cachedPathIds: string[] = [];

  /**
   * Gets the current cached result without recomputing.
   */
  get(): SplitPathResult | null {
    return this.cachedResult;
  }

  /**
   * Checks if the cache is valid for the given path IDs.
   */
  isValidFor(pathIds: string[]): boolean {
    if (this.cachedResult === null) return false;
    if (pathIds.length !== this.cachedPathIds.length) return false;

    // Check if the same paths are cached (order-independent)
    const sortedCached = [...this.cachedPathIds].sort();
    const sortedProvided = [...pathIds].sort();

    return sortedCached.every((id, index) => id === sortedProvided[index]);
  }

  /**
   * Refreshes the cache with new path data.
   * Returns the computed result or null if validation fails.
   */
  refresh(paths: PathElement[]): SplitPathResult | null {
    // Validate paths for trim
    const validation = validatePathsForTrim(paths);
    if (!validation.isValid || paths.length < 2) {
      this.clear();
      return null;
    }

    // Compute intersections
    const intersections = computePathIntersections(paths);

    if (intersections.length === 0) {
      // No intersections, but keep an empty result
      this.cachedResult = {
        intersections: [],
        segments: [],
        originalPaths: new Map()
      };
      this.cachedPathIds = paths.map(p => p.id);
      return this.cachedResult;
    }

    // Split paths into trimmable segments
    const splitResult = splitPathsByIntersections(paths, intersections);

    // Update cache
    this.cachedResult = splitResult;
    this.cachedPathIds = paths.map(p => p.id);

    return this.cachedResult;
  }

  /**
   * Refreshes the cache using pre-computed segments from reconstruction.
   * This avoids re-parsing paths and losing segment structure.
   */
  refreshWithSegments(
    paths: PathElement[],
    preComputedSegments: TrimSegment[],
    intersections: TrimIntersection[]
  ): SplitPathResult | null {
    // Build originalPaths map
    const originalPaths = new Map<string, PathElement>();
    for (const path of paths) {
      originalPaths.set(path.id, path);
    }

    // Create split result with provided segments
    const splitResult: SplitPathResult = {
      intersections,
      segments: preComputedSegments,
      originalPaths,
    };

    // Update cache
    this.cachedResult = splitResult;
    this.cachedPathIds = paths.map(p => p.id);

    return this.cachedResult;
  }

  /**
   * Clears the cache.
   */
  clear(): void {
    this.cachedResult = null;
    this.cachedPathIds = [];
  }

  /**
   * Gets the cached path IDs.
   */
  getCachedPathIds(): string[] {
    return [...this.cachedPathIds];
  }
}

// Export a singleton instance
export const trimPathCache = new TrimPathCache();
