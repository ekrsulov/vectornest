/**
 * Animation System Integration Module
 * 
 * Exports integration components for connecting the animation system
 * with the main canvas and other parts of the application.
 */

export {
  AnimationGizmoOverlay,
  initializeGizmoSystem,
  useAnimationGizmos,
  useGizmosForAnimation,
  useGizmoCategories,
  useGizmosByCategory,
} from './AnimationGizmoCanvasIntegration';

export type {
  GizmoState,
  AnimationGizmoDefinition,
} from './AnimationGizmoCanvasIntegration';
