/**
 * Animation Gizmo Canvas Integration
 * 
 * This module provides the integration layer between the animation gizmo system
 * and the main canvas. It exports components and hooks that can be used to
 * render gizmos on the canvas overlay.
 */

	import React, { useCallback, useMemo, useEffect, useRef } from 'react';
	import { useShallow } from 'zustand/react/shallow';
	import { useCanvasStore, type CanvasStore } from '../../../store/canvasStore';
	import { useGizmoContext } from '../gizmos/GizmoContext';
	import { GizmoOverlay } from '../gizmos/GizmoOverlay';
	import { useGizmoInteraction } from '../gizmos/GizmoInteractionHandler';
	import { registerCoreGizmos } from '../gizmos';
	import { getViewBoxString } from '../../../canvas/viewport/ViewportController';
	import { useDoubleTap } from '../../../canvas/hooks/useDoubleTap';
	import type { AnimationPluginSlice } from '../types';
	import type { CanvasElement } from '../../../types';
		import type { SVGAnimation } from '../types';

// Track if gizmos have been registered
let gizmosRegistered = false;

/**
 * Initialize the gizmo system.
 * Should be called once during application startup.
 */
// eslint-disable-next-line react-refresh/only-export-components
function initializeGizmoSystem(): void {
  if (gizmosRegistered) return;
  registerCoreGizmos();
  gizmosRegistered = true;
}

/**
 * Props for the AnimationGizmoOverlay component
 */
interface AnimationGizmoOverlayProps {
  /** The SVG viewport parameters */
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  /** Canvas dimensions */
  canvasSize: {
    width: number;
    height: number;
  };
}

/**
 * Internal component that renders the gizmo overlay.
 * Must be wrapped in GizmoProvider.
 */
	const AnimationGizmoOverlayInner: React.FC<AnimationGizmoOverlayProps> = ({
	  viewport: _viewport,
	  canvasSize: _canvasSize,
	}) => {
	  const { activeGizmos, deactivateGizmo, gizmoEditMode, setGizmoEditMode, draggingHandle } = useGizmoContext();
	  const svgRef = useRef<SVGSVGElement>(null);
	  const { handleCanvasTouchEnd: detectCanvasDoubleTap } = useDoubleTap();
	  
	  // Initialize gizmo interaction handler for drag events - only when in edit mode
	  const { handleDragStart } = useGizmoInteraction({
	    svgRef,
	    enabled: gizmoEditMode && activeGizmos.size > 0,
	  });
  
  // Get animation state from store
  const { animations, selectedElementIds, elements } = useCanvasStore(
    useShallow((state) => {
      const animState = state as CanvasStore & AnimationPluginSlice;
      return {
        animations: (animState.animations ?? []) as SVGAnimation[],
        selectedElementIds: state.selectedIds ?? [],
        elements: state.elements as CanvasElement[],
      };
    })
  );
  
  // Get the currently selected element and its ancestors (for group support)
  const { selectedElement, ancestorIds } = useMemo(() => {
    if (!selectedElementIds || selectedElementIds.length !== 1) {
      return { selectedElement: null, ancestorIds: [] as string[] };
    }
    
    const element = elements.find(el => el.id === selectedElementIds[0]);
    if (!element) return { selectedElement: null, ancestorIds: [] as string[] };
    
    // Build ancestor chain
    const ancestors: string[] = [];
    let currentId = element.parentId;
    while (currentId) {
      ancestors.push(currentId);
      const parent = elements.find(el => el.id === currentId);
      currentId = parent?.parentId ?? null;
    }
    
    return { selectedElement: element, ancestorIds: ancestors };
  }, [selectedElementIds, elements]);
  
  // Get animations for the selected element AND its ancestors
  const elementAnimations = useMemo(() => {
    if (!selectedElement) return [];
    const relevantIds = new Set([selectedElement.id, ...ancestorIds]);
    return animations.filter(anim => relevantIds.has(anim.targetElementId));
  }, [selectedElement, ancestorIds, animations]);
  
  // Deactivate gizmos when element is deselected (but don't auto-activate)
  useEffect(() => {
    if (!selectedElement) {
      // Deactivate all gizmos when no element is selected
      if (activeGizmos.size > 0) {
        activeGizmos.forEach((_gizmo, animationId) => {
          deactivateGizmo(animationId);
        });
      }
    }
  }, [selectedElement, activeGizmos, deactivateGizmo]);
  
  // Also deactivate gizmos if the selected element changes and the active gizmo
  // doesn't belong to the new element
  useEffect(() => {
    if (!selectedElement || elementAnimations.length === 0) return;
    
    const elementAnimationIds = new Set(elementAnimations.map(a => a.id));
    activeGizmos.forEach((_gizmo, animationId) => {
      if (!elementAnimationIds.has(animationId)) {
        deactivateGizmo(animationId);
      }
    });
  }, [selectedElement, elementAnimations, activeGizmos, deactivateGizmo]);
  
	  const exitGizmoMode = useCallback(() => {
	    setGizmoEditMode(false);
	  }, [setGizmoEditMode]);

	  const handleOverlayDoubleClick = useCallback(
	    (e: React.MouseEvent<SVGSVGElement>) => {
	      const target = e.target as Element | null;
	      const isOnHandle = Boolean(target?.closest?.('.gizmo-handle'));
	      if (isOnHandle) return;

	      e.preventDefault();
	      e.stopPropagation();
	      exitGizmoMode();
	    },
	    [exitGizmoMode]
	  );

	  const handleOverlayTouchEnd = useCallback(
	    (e: React.TouchEvent<SVGSVGElement>) => {
	      const target = e.target as Element | null;
	      const isOnHandle = Boolean(target?.closest?.('.gizmo-handle'));
	      if (isOnHandle) return;

	      if (draggingHandle) return;

	      const isDoubleTap = detectCanvasDoubleTap(e);
	      if (!isDoubleTap) return;

	      e.preventDefault();
	      e.stopPropagation();
	      exitGizmoMode();
	    },
	    [detectCanvasDoubleTap, draggingHandle, exitGizmoMode]
	  );

	  // Only show gizmos when in edit mode and there are active gizmos
	  if (!gizmoEditMode || activeGizmos.size === 0) {
	    return null;
	  }

	  // Create viewBox string matching the main canvas (use same calculation)
	  const viewBox = getViewBoxString(_viewport, _canvasSize);
	  
	  return (
	    <div
	      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto', // Capture all events when in gizmo mode
        zIndex: 1000,
      }}
    >
	      <svg
	        ref={svgRef}
	        width="100%"
	        height="100%"
	        viewBox={viewBox}
	        onDoubleClick={handleOverlayDoubleClick}
	        onTouchEnd={handleOverlayTouchEnd}
	        style={{ 
	          position: 'absolute',
	          top: 0,
	          left: 0,
	          overflow: 'visible',
        }}
      >
        {/* Background rect to capture events and prevent canvas interaction */}
        <rect
          x={-_viewport.panX / _viewport.zoom}
          y={-_viewport.panY / _viewport.zoom}
          width={_canvasSize.width / _viewport.zoom}
          height={_canvasSize.height / _viewport.zoom}
          fill="transparent"
          style={{ pointerEvents: 'auto' }}
        />
        <GizmoOverlay onDragStart={handleDragStart} />
      </svg>
    </div>
  );
};

/**
 * Main overlay component for rendering animation gizmos on the canvas.
 * This component should be placed after the main canvas content
 * but within the same SVG or as an overlay.
 * NOTE: Requires GizmoProvider to be an ancestor (typically in App.tsx)
 */
export const AnimationGizmoOverlay: React.FC<AnimationGizmoOverlayProps> = (props) => {
  // Ensure gizmos are registered
  useEffect(() => {
    initializeGizmoSystem();
  }, []);
  
  // GizmoProvider is now at App level, so we just render the inner component directly
  return <AnimationGizmoOverlayInner {...props} />;
};


