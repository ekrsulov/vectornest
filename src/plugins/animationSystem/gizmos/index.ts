/**
 * Animation Gizmo System - Index
 * 
 * Public exports for the animation gizmo system.
 * This module provides the infrastructure for visual animation editing.
 */

// Types
export * from './types';

// Registry
export { animationGizmoRegistry } from './registry/GizmoRegistry';

// Bootstrap
export { ensureCoreGizmosRegistered } from './bootstrap';

// Contributions (gizmo definitions)
export * from './contributions';
