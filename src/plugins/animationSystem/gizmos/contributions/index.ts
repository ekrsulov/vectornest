/**
 * Gizmo Contributions Index
 * 
 * Registers all 50 gizmo definitions with the registry.
 * Import this module to activate gizmo support.
 */

import { animationGizmoRegistry } from '../registry/GizmoRegistry';

// Import gizmo definitions by category
import { transformGizmos } from './TransformGizmos';
import { vectorGizmos } from './VectorGizmos';
import { styleGizmos } from './StyleGizmos';
import { clipMaskGizmos } from './ClipMaskGizmos';
import { gradientPatternGizmos } from './GradientPatternGizmos';
import { filterGizmos } from './FilterGizmos';
import { hierarchyGizmos } from './HierarchyGizmos';
import { interactiveGizmos } from './InteractiveGizmos';
import { typographyGizmos } from './TypographyGizmos';
import { fxGizmos } from './FXGizmos';
import { sceneGizmos } from './SceneGizmos';

/**
 * Register all core gizmos.
 * Called during plugin initialization.
 */
export function registerCoreGizmos(): void {
  // Category I: Transform gizmos (01-04)
  animationGizmoRegistry.registerAll(transformGizmos);
  
  // Category II: Vector gizmos (05-07)
  animationGizmoRegistry.registerAll(vectorGizmos);
  
  // Category III: Style gizmos (08-10)
  animationGizmoRegistry.registerAll(styleGizmos);
  
  // Category IV: Clip/Mask gizmos (11-13)
  animationGizmoRegistry.registerAll(clipMaskGizmos);
  
  // Category V: Gradient/Pattern gizmos (14-17)
  animationGizmoRegistry.registerAll(gradientPatternGizmos);
  
  // Category VI: Filter gizmos (18-20)
  animationGizmoRegistry.registerAll(filterGizmos);
  
  // Category VII: Hierarchy gizmos (21-26)
  animationGizmoRegistry.registerAll(hierarchyGizmos);
  
  // Category VIII: Interactive gizmos (27-30)
  animationGizmoRegistry.registerAll(interactiveGizmos);
  
  // Category IX: Typography gizmos (31-34)
  animationGizmoRegistry.registerAll(typographyGizmos);
  
  // Category X: FX gizmos (35-44)
  animationGizmoRegistry.registerAll(fxGizmos);
  
  // Category XI: Scene gizmos (45-50)
  animationGizmoRegistry.registerAll(sceneGizmos);
}

