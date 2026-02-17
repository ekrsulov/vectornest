/**
 * Animation Gizmo Registry
 * 
 * Central registry for animation gizmo definitions.
 * Allows dynamic registration of gizmos by plugins and provides
 * lookup functionality for matching gizmos to animations.
 */

import type { CanvasElement } from '../../../../types';
import type { SVGAnimation } from '../../types';
import type {
  AnimationGizmoDefinition,
  AnimationCategory,
  SMILTarget,
  GizmoQueryOptions,
  GizmoRegistryListener,
} from '../types';

/**
 * Registry for animation gizmo definitions.
 * 
 * Gizmos are registered with a unique ID and can be queried by:
 * - ID (exact match)
 * - Category (group of related gizmos)
 * - Animation (finds applicable gizmo for a given animation)
 * 
 * @example
 * ```typescript
 * // Register a gizmo
 * animationGizmoRegistry.register(rotateGizmoDefinition);
 * 
 * // Find gizmo for an animation
 * const gizmo = animationGizmoRegistry.findForAnimation(animation, element);
 * ```
 */
export class AnimationGizmoRegistry {
  private gizmos = new Map<string, AnimationGizmoDefinition>();
  private byCategory = new Map<AnimationCategory, Set<string>>();
  private bySMILTarget = new Map<SMILTarget, Set<string>>();
  private listeners = new Set<GizmoRegistryListener>();

  /**
   * Register a new animation gizmo definition.
   * 
   * @param definition - The gizmo definition to register
   * @throws Error if a gizmo with the same ID is already registered
   */
  register(definition: AnimationGizmoDefinition): void {
    if (this.gizmos.has(definition.id)) {
      console.warn(
        `[AnimationGizmoRegistry] Gizmo "${definition.id}" already registered, replacing.`
      );
    }

    this.gizmos.set(definition.id, definition);

    // Index by category
    if (!this.byCategory.has(definition.category)) {
      this.byCategory.set(definition.category, new Set());
    }
    this.byCategory.get(definition.category)!.add(definition.id);

    // Index by SMIL target
    if (definition.smilTarget) {
      if (!this.bySMILTarget.has(definition.smilTarget)) {
        this.bySMILTarget.set(definition.smilTarget, new Set());
      }
      this.bySMILTarget.get(definition.smilTarget)!.add(definition.id);
    }

    this.notifyListeners();
  }

  /**
   * Register multiple gizmo definitions at once.
   * 
   * @param definitions - Array of gizmo definitions to register
   */
  registerAll(definitions: AnimationGizmoDefinition[]): void {
    definitions.forEach((def) => this.register(def));
  }

  /**
   * Unregister a gizmo by ID.
   * 
   * @param id - The ID of the gizmo to unregister
   * @returns true if the gizmo was found and removed
   */
  unregister(id: string): boolean {
    const definition = this.gizmos.get(id);
    if (!definition) return false;

    this.gizmos.delete(id);

    // Remove from category index
    this.byCategory.get(definition.category)?.delete(id);

    // Remove from SMIL target index
    if (definition.smilTarget) {
      this.bySMILTarget.get(definition.smilTarget)?.delete(id);
    }

    this.notifyListeners();
    return true;
  }

  /**
   * Get a gizmo definition by ID.
   * 
   * @param id - The gizmo ID
   * @returns The gizmo definition or undefined if not found
   */
  get(id: string): AnimationGizmoDefinition | undefined {
    return this.gizmos.get(id);
  }

  /**
   * Check if a gizmo is registered.
   * 
   * @param id - The gizmo ID
   * @returns true if the gizmo is registered
   */
  has(id: string): boolean {
    return this.gizmos.has(id);
  }

  /**
   * Get all gizmo definitions for a category.
   * 
   * @param category - The animation category
   * @returns Array of gizmo definitions in that category
   */
  getByCategory(category: AnimationCategory): AnimationGizmoDefinition[] {
    const ids = this.byCategory.get(category);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.gizmos.get(id))
      .filter((g): g is AnimationGizmoDefinition => g !== undefined);
  }

  /**
   * Get all gizmo definitions for a SMIL target type.
   * 
   * @param target - The SMIL target type
   * @returns Array of gizmo definitions for that target
   */
  getBySMILTarget(target: SMILTarget): AnimationGizmoDefinition[] {
    const ids = this.bySMILTarget.get(target);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.gizmos.get(id))
      .filter((g): g is AnimationGizmoDefinition => g !== undefined);
  }

  /**
   * Find the appropriate gizmo for an animation.
   * Returns the first gizmo whose `appliesTo` function returns true.
   * 
   * @param animation - The animation to find a gizmo for
   * @param element - The target element of the animation
   * @returns The matching gizmo definition or undefined
   */
  findForAnimation(
    animation: SVGAnimation,
    element: CanvasElement
  ): AnimationGizmoDefinition | undefined {
    // First, try to find by SMIL target for faster lookup
    const smilTarget = this.animationTypeToSMILTarget(animation.type);
    let candidates = smilTarget
      ? this.getBySMILTarget(smilTarget)
      : [];
    
    // If no candidates found by SMIL target, search all gizmos
    // This handles gizmos that use canHandle without smilTarget
    if (candidates.length === 0) {
      candidates = this.getAll();
    }

    for (const gizmo of candidates) {
      try {
        if (gizmo.appliesTo?.(animation, element) || gizmo.canHandle?.(animation)) {
          return gizmo;
        }
      } catch (error) {
        console.warn(
          `[AnimationGizmoRegistry] Error in appliesTo for gizmo "${gizmo.id}":`,
          error
        );
      }
    }

    return undefined;
  }

  /**
   * Find all gizmos that could apply to an animation.
   * Useful for showing alternative gizmo options.
   * 
   * @param animation - The animation
   * @param element - The target element
   * @returns Array of applicable gizmo definitions
   */
  findAllForAnimation(
    animation: SVGAnimation,
    element: CanvasElement
  ): AnimationGizmoDefinition[] {
    return this.getAll().filter((gizmo) => {
      try {
        return gizmo.appliesTo?.(animation, element) || gizmo.canHandle?.(animation);
      } catch {
        return false;
      }
    });
  }

  /**
   * Query gizmos with optional filters.
   * 
   * @param options - Filter options
   * @returns Array of matching gizmo definitions
   */
  query(options: GizmoQueryOptions = {}): AnimationGizmoDefinition[] {
    let results = this.getAll();

    if (options.category) {
      results = results.filter((g) => g.category === options.category);
    }

    if (options.smilTarget) {
      results = results.filter((g) => g.smilTarget === options.smilTarget);
    }

    if (options.attribute) {
      results = results.filter((g) =>
        g.targetAttributes?.includes(options.attribute!) ?? false
      );
    }

    return results;
  }

  /**
   * Get all registered gizmo definitions.
   * 
   * @returns Array of all gizmo definitions
   */
  getAll(): AnimationGizmoDefinition[] {
    return Array.from(this.gizmos.values());
  }

  /**
   * Get count of registered gizmos.
   */
  get size(): number {
    return this.gizmos.size;
  }

  /**
   * Get all registered categories.
   * 
   * @returns Array of categories that have registered gizmos
   */
  getCategories(): AnimationCategory[] {
    return Array.from(this.byCategory.keys()).filter(
      (cat) => (this.byCategory.get(cat)?.size ?? 0) > 0
    );
  }

  /**
   * Subscribe to registry changes.
   * 
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  subscribe(listener: GizmoRegistryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear all registered gizmos.
   * Mainly useful for testing.
   */
  clear(): void {
    this.gizmos.clear();
    this.byCategory.clear();
    this.bySMILTarget.clear();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error('[AnimationGizmoRegistry] Error in listener:', error);
      }
    });
  }

  private animationTypeToSMILTarget(
    type: SVGAnimation['type']
  ): SMILTarget | undefined {
    switch (type) {
      case 'animate':
        return 'animate';
      case 'animateTransform':
        return 'animateTransform';
      case 'animateMotion':
        return 'animateMotion';
      case 'set':
        return 'set';
      default:
        return undefined;
    }
  }
}

/**
 * Global singleton instance of the animation gizmo registry.
 * Use this to register and query gizmos.
 */
export const animationGizmoRegistry = new AnimationGizmoRegistry();
