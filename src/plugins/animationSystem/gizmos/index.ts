/**
 * Animation Gizmo System - Index
 * 
 * Public exports for the animation gizmo system.
 * This module provides the infrastructure for visual animation editing.
 */

// Types
export * from './types';

// Registry
export { animationGizmoRegistry, AnimationGizmoRegistry } from './registry/GizmoRegistry';

// Context & Provider
export { GizmoProvider, useGizmoContext, useGizmoContextOptional } from './GizmoContext';
export type { GizmoContextValue } from './GizmoContext';

// Overlay Components
export { GizmoOverlay, GizmoOverlayStandalone } from './GizmoOverlay';
export type { GizmoOverlayProps } from './GizmoOverlay';

// Interaction Handler
export {
  GizmoInteractionHandler,
  useGizmoInteraction,
  hitTestGizmoHandle,
  hitTestGizmo,
  constrainToAxis,
  snapToGrid,
  constrainRotation,
  constrainUniformScale,
} from './GizmoInteractionHandler';
export type {
  GizmoInteractionHandlerConfig,
  ModifierState,
  UseGizmoInteractionOptions,
} from './GizmoInteractionHandler';

// Contributions (gizmo definitions)
export * from './contributions';

// Re-export commonly used types for convenience
export type {
  AnimationGizmoDefinition,
  AnimationCategory,
  SMILTarget,
  GizmoHandle,
  GizmoState,
  GizmoContext,
  GizmoRenderContext,
  GizmoInteractionContext,
  GizmoVisual,
  GizmoConfigPanelProps,
  ElementAnimationState,
} from './types';
