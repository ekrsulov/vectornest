/**
 * Gizmo Context Provider
 * 
 * Provides gizmo state and actions to child components.
 * This context bridges the gizmo system with React components.
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../../store/canvasStore';
import { animationGizmoRegistry } from './registry/GizmoRegistry';
import type {
  GizmoState,
  GizmoRenderContext,
  GizmoInteractionContext,
  AnimationGizmoDefinition,
} from './types';
import type { SVGAnimation, AnimationPluginSlice } from '../types';
import type { CanvasElement, GroupElement, Point } from '../../../types';
import type { Bounds } from '../../../utils/boundsUtils';
import { formatToPrecision } from '../../../utils';
import { elementContributionRegistry } from '../../../utils/elementContributionRegistry';
import { getGroupBounds } from '../../../canvas/geometry/CanvasGeometryService';

// =============================================================================
// Context Types
// =============================================================================

export interface GizmoContextValue {
  // State
  activeGizmos: Map<string, GizmoState>;
  focusedGizmoAnimationId: string | null;
  gizmoEditMode: boolean;
  draggingHandle: { animationId: string; handleId: string } | null;
  viewport: { zoom: number; panX: number; panY: number };
  
  // Actions
  activateGizmo: (animationId: string) => void;
  deactivateGizmo: (animationId: string) => void;
  deactivateAllGizmos: () => void;
  setFocusedGizmo: (animationId: string | null) => void;
  setGizmoEditMode: (enabled: boolean) => void;
  updateGizmoState: (animationId: string, updates: Partial<GizmoState['props']>) => void;
  focusGizmo: (animationId: string) => void;
  updateGizmoProps: (animationId: string, props: Partial<GizmoState['props']>) => void;
  
  // Interaction
  startDrag: (animationId: string, handleId: string, point: Point) => void;
  updateDrag: (point: Point, modifiers: GizmoInteractionContext['modifiers']) => void;
  endDrag: () => void;
  
  // Queries
  getGizmoDefinition: (animationId: string) => AnimationGizmoDefinition | undefined;
  getGizmoRenderContext: (animationId: string) => GizmoRenderContext | null;
  getAnimation: (animationId: string) => SVGAnimation | undefined;
  getElement: (elementId: string) => CanvasElement | undefined;
  getElementBounds: (elementId: string) => Bounds | null;
}

const GizmoContext = createContext<GizmoContextValue | null>(null);

// =============================================================================
// Hook
// =============================================================================

// eslint-disable-next-line react-refresh/only-export-components
export function useGizmoContext(): GizmoContextValue {
  const context = useContext(GizmoContext);
  if (!context) {
    throw new Error('useGizmoContext must be used within a GizmoProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if not within provider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useGizmoContextOptional(): GizmoContextValue | null {
  return useContext(GizmoContext);
}

// =============================================================================
// Provider Props
// =============================================================================

interface GizmoProviderProps {
  children: ReactNode;
}

// =============================================================================
// Provider Component
// =============================================================================

export function GizmoProvider({ children }: GizmoProviderProps): React.ReactElement {
  // Store state
  const {
    animations,
    elements,
    viewport,
    animationState,
    updateAnimation,
    precision,
  } = useCanvasStore(
    useShallow((state) => {
      const animSlice = state as CanvasStore & AnimationPluginSlice;
      return {
        animations: animSlice.animations ?? [],
        elements: state.elements,
        viewport: state.viewport,
        animationState: animSlice.animationState,
        updateAnimation: animSlice.updateAnimation,
        precision: state.settings.keyboardMovementPrecision,
      };
    })
  );

  const colorMode = useCanvasStore((state) => state.colorMode ?? 'light');

  // Local gizmo state (could also be in Zustand if needed globally)
  const [activeGizmos, setActiveGizmos] = useState<Map<string, GizmoState>>(new Map());
  const [focusedGizmoAnimationId, setFocusedGizmoAnimationId] = useState<string | null>(null);
  const [gizmoEditMode, setGizmoEditModeState] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState<{
    animationId: string;
    handleId: string;
  } | null>(null);

  // Refs for drag state
  const dragStartRef = useRef<Point | null>(null);
  const dragCurrentRef = useRef<Point | null>(null);

  // Element map for quick lookups
  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => map.set(el.id, el));
    return map;
  }, [elements]);

  // Animation map for quick lookups
  const animationMap = useMemo(() => {
    const map = new Map<string, SVGAnimation>();
    animations.forEach((anim) => map.set(anim.id, anim));
    return map;
  }, [animations]);

  // Get element bounds with accumulated transforms applied
  const getElementBounds = useCallback(
    (elementId: string): Bounds | null => {
      const element = elementMap.get(elementId);
      if (!element) return null;

      const boundsViewport = { zoom: viewport.zoom, panX: 0, panY: 0 };

      if (element.type === 'group') {
        return getGroupBounds(element as GroupElement, elementMap, boundsViewport);
      }

      return elementContributionRegistry.getBounds(element, {
        viewport: boundsViewport,
        elementMap,
      });
    },
    [elementMap, viewport.zoom]
  );

  // Get gizmo definition for an animation
  const getGizmoDefinition = useCallback(
    (animationId: string): AnimationGizmoDefinition | undefined => {
      const animation = animationMap.get(animationId);
      if (!animation) return undefined;

      const element = elementMap.get(animation.targetElementId);
      if (!element) return undefined;

      return animationGizmoRegistry.findForAnimation(animation, element);
    },
    [animationMap, elementMap]
  );

  // Activate a gizmo for an animation
  const activateGizmo = useCallback(
    (animationId: string) => {
      const animation = animationMap.get(animationId);
      if (!animation) {
        console.warn(`[GizmoContext] Animation not found: ${animationId}`);
        return;
      }

      const element = elementMap.get(animation.targetElementId);
      if (!element) {
        console.warn(`[GizmoContext] Element not found: ${animation.targetElementId}`);
        return;
      }

      const definition = animationGizmoRegistry.findForAnimation(animation, element);
      if (!definition) {
        console.warn(`[GizmoContext] No gizmo found for animation: ${animationId}`);
        return;
      }

      const gizmoState = definition.fromAnimation(animation, element);

      setActiveGizmos((prev) => {
        const next = new Map(prev);
        next.set(animationId, gizmoState);
        return next;
      });

      setFocusedGizmoAnimationId(animationId);
    },
    [animationMap, elementMap]
  );

  // Deactivate a gizmo
  const deactivateGizmo = useCallback((animationId: string) => {
    setActiveGizmos((prev) => {
      const next = new Map(prev);
      next.delete(animationId);
      return next;
    });

    setFocusedGizmoAnimationId((prev) => (prev === animationId ? null : prev));
  }, []);

  // Deactivate all gizmos
  const deactivateAllGizmos = useCallback(() => {
    setActiveGizmos(new Map());
    setFocusedGizmoAnimationId(null);
    setDraggingHandle(null);
  }, []);

  // Set gizmo edit mode
  const setGizmoEditMode = useCallback((enabled: boolean) => {
    setGizmoEditModeState(enabled);
    if (!enabled) {
      setActiveGizmos(new Map());
      setFocusedGizmoAnimationId(null);
      setDraggingHandle(null);
    }
  }, []);

  // Update gizmo state
  const updateGizmoState = useCallback(
    (animationId: string, updates: Partial<GizmoState['props']>) => {
      setActiveGizmos((prev) => {
        const gizmo = prev.get(animationId);
        if (!gizmo) return prev;

        const next = new Map(prev);
        next.set(animationId, {
          ...gizmo,
          props: { ...gizmo.props, ...updates },
        });
        return next;
      });
    },
    []
  );

  // Start drag interaction
  const startDrag = useCallback(
    (animationId: string, handleId: string, point: Point) => {
      console.log('[GizmoContext] startDrag', { animationId, handleId, point });
      
      dragStartRef.current = point;
      dragCurrentRef.current = point;
      setDraggingHandle({ animationId, handleId });

      // Update gizmo interaction state
      setActiveGizmos((prev) => {
        const gizmo = prev.get(animationId);
        console.log('[GizmoContext] startDrag - found gizmo?', { found: !!gizmo, animationId });
        if (!gizmo) return prev;

        const next = new Map(prev);
        next.set(animationId, {
          ...gizmo,
          interaction: {
            ...gizmo.interaction,
            activeHandle: handleId,
            isDragging: true,
            dragStart: point,
          },
        });
        return next;
      });
    },
    []
  );

  // Update drag
  const updateDrag = useCallback(
    (point: Point, modifiers: GizmoInteractionContext['modifiers']) => {
      console.log('[GizmoContext] updateDrag', { point, draggingHandle, hasDragStart: !!dragStartRef.current });
      
      if (!draggingHandle || !dragStartRef.current) {
        console.log('[GizmoContext] updateDrag - BLOCKED: no draggingHandle or dragStart');
        return;
      }

      const { animationId, handleId } = draggingHandle;
      dragCurrentRef.current = point;

      const gizmo = activeGizmos.get(animationId);
      if (!gizmo) {
        console.log('[GizmoContext] updateDrag - BLOCKED: no gizmo for', animationId);
        return;
      }

      const animation = animationMap.get(animationId);
      if (!animation) {
        console.log('[GizmoContext] updateDrag - BLOCKED: no animation for', animationId);
        return;
      }

      const element = elementMap.get(animation.targetElementId);
      if (!element) {
        console.log('[GizmoContext] updateDrag - BLOCKED: no element for', animation.targetElementId);
        return;
      }

      const definition = animationGizmoRegistry.get(gizmo.gizmoId);
      if (!definition) {
        console.log('[GizmoContext] updateDrag - BLOCKED: no definition for', gizmo.gizmoId);
        return;
      }

      const bounds = getElementBounds(element.id);
      if (!bounds) {
        console.log('[GizmoContext] updateDrag - BLOCKED: no bounds for', element.id);
        return;
      }

      const delta: Point = {
        x: point.x - dragStartRef.current.x,
        y: point.y - dragStartRef.current.y,
      };
      
      console.log('[GizmoContext] updateDrag - calling handle.onDrag', { delta, handleId });

      // Create interaction context
      const interactionContext: GizmoInteractionContext = {
        state: gizmo,
        animation,
        element,
        elementBounds: bounds,
        elementCenter: {
          x: (bounds.minX + bounds.maxX) / 2,
          y: (bounds.minY + bounds.maxY) / 2,
        },
        viewport,
        colorMode,
        precision,
        currentTime: animationState?.currentTime ?? 0,
        duration: parseFloat(String(animation.dur ?? '1s').replace('s', '')),
        isPlaying: animationState?.isPlaying ?? false,
        progress: 0,
        dragStart: dragStartRef.current,
        currentPoint: point,
        delta,
        modifiers,
        updateState: (updates) => {
          const roundedUpdates = Object.fromEntries(
            Object.entries(updates).map(([key, value]) => [
              key,
              typeof value === 'number' && Number.isFinite(value)
                ? formatToPrecision(value, precision)
                : value,
            ])
          );
          updateGizmoState(animationId, roundedUpdates);
        },
        updateAnimation: (updates) => {
          const roundedUpdates = Object.fromEntries(
            Object.entries(updates).map(([key, value]) => [
              key,
              typeof value === 'number' && Number.isFinite(value)
                ? formatToPrecision(value, precision)
                : value,
            ])
          ) as Partial<SVGAnimation>;
          updateAnimation(animationId, roundedUpdates);
        },
        commitChanges: () => {
          // In a full implementation, this would commit to undo history
        },
      };

      const handles =
        typeof definition.handles === 'function'
          ? definition.handles(interactionContext)
          : definition.handles;

      const handle = handles.find((h) => h.id === handleId);
      if (!handle) {
        console.log('[GizmoContext] updateDrag - BLOCKED: no handle', handleId);
        return;
      }

      // Call handle's onDrag
      handle.onDrag(delta, interactionContext);

      // Update drag start for next delta calculation (incremental)
      dragStartRef.current = point;
    },
    [
      draggingHandle,
      activeGizmos,
      animationMap,
      elementMap,
      viewport,
      colorMode,
      animationState,
      getElementBounds,
      updateGizmoState,
      updateAnimation,
      precision,
    ]
  );

  // End drag
  const endDrag = useCallback(() => {
    if (!draggingHandle) return;

    const { animationId, handleId } = draggingHandle;
    const gizmo = activeGizmos.get(animationId);

	    if (gizmo) {
	      const animation = animationMap.get(animationId);
	      const element = animation ? elementMap.get(animation.targetElementId) : undefined;
	      const definition = animationGizmoRegistry.get(gizmo.gizmoId);

	      if (definition && animation && element) {
	        const bounds = getElementBounds(element.id);
	        if (bounds && dragStartRef.current && dragCurrentRef.current) {
	          const interactionContext: GizmoInteractionContext = {
	            state: gizmo,
	            animation,
	            element,
	            elementBounds: bounds,
	            elementCenter: {
	              x: (bounds.minX + bounds.maxX) / 2,
	              y: (bounds.minY + bounds.maxY) / 2,
	            },
	            viewport,
	            colorMode,
	            precision,
	            currentTime: animationState?.currentTime ?? 0,
	            duration: parseFloat(String(animation.dur ?? '1s').replace('s', '')),
	            isPlaying: animationState?.isPlaying ?? false,
	            progress: 0,
	            dragStart: dragStartRef.current,
	            currentPoint: dragCurrentRef.current,
	            delta: {
	              x: dragCurrentRef.current.x - dragStartRef.current.x,
	              y: dragCurrentRef.current.y - dragStartRef.current.y,
	            },
	            modifiers: { shift: false, alt: false, meta: false, ctrl: false },
	            updateState: (updates) => {
	              const roundedUpdates = Object.fromEntries(
	                Object.entries(updates).map(([key, value]) => [
	                  key,
	                  typeof value === 'number' && Number.isFinite(value)
	                    ? formatToPrecision(value, precision)
	                    : value,
	                ])
	              );
	              updateGizmoState(animationId, roundedUpdates);
	            },
	            updateAnimation: (updates) => {
	              const roundedUpdates = Object.fromEntries(
	                Object.entries(updates).map(([key, value]) => [
	                  key,
	                  typeof value === 'number' && Number.isFinite(value)
	                    ? formatToPrecision(value, precision)
	                    : value,
	                ])
	              ) as Partial<SVGAnimation>;
	              updateAnimation(animationId, roundedUpdates);
	            },
	            commitChanges: () => {},
	          };

	          const handles =
	            typeof definition.handles === 'function'
	              ? definition.handles(interactionContext)
	              : definition.handles;
	          const handle = handles.find((h) => h.id === handleId);

	          if (handle?.onDragEnd) {
	            handle.onDragEnd(interactionContext);
	          }
	        }
	      }

      // Reset interaction state
      setActiveGizmos((prev) => {
        const next = new Map(prev);
        const g = next.get(animationId);
        if (g) {
          next.set(animationId, {
            ...g,
            interaction: {
              ...g.interaction,
              activeHandle: null,
              isDragging: false,
              dragStart: null,
            },
          });
        }
        return next;
      });
    }

    dragStartRef.current = null;
    dragCurrentRef.current = null;
    setDraggingHandle(null);
	  }, [
	    draggingHandle,
	    activeGizmos,
	    animationMap,
	    elementMap,
	    viewport,
	    colorMode,
	    precision,
	    animationState,
	    getElementBounds,
	    updateGizmoState,
	    updateAnimation,
	  ]);

  // Get render context for a gizmo
  const getGizmoRenderContext = useCallback(
    (animationId: string): GizmoRenderContext | null => {
      const gizmo = activeGizmos.get(animationId);
      if (!gizmo) return null;

      const animation = animationMap.get(animationId);
      if (!animation) return null;

      const element = elementMap.get(animation.targetElementId);
      if (!element) return null;

      const bounds = getElementBounds(element.id);
      if (!bounds) return null;

      const duration = parseFloat(String(animation.dur ?? '1s').replace('s', ''));
      const currentTime = animationState?.currentTime ?? 0;

      return {
        state: gizmo,
        animation,
        element,
        elementBounds: bounds,
        elementCenter: {
          x: (bounds.minX + bounds.maxX) / 2,
          y: (bounds.minY + bounds.maxY) / 2,
        },
        viewport,
        colorMode,
        precision,
        currentTime,
        duration,
        isPlaying: animationState?.isPlaying ?? false,
        progress: duration > 0 ? currentTime / duration : 0,
      };
    },
    [activeGizmos, animationMap, elementMap, viewport, colorMode, precision, animationState, getElementBounds]
  );

  // Get animation by ID
  const getAnimation = useCallback(
    (animationId: string): SVGAnimation | undefined => {
      return animationMap.get(animationId);
    },
    [animationMap]
  );

  // Get element by ID
  const getElement = useCallback(
    (elementId: string): CanvasElement | undefined => {
      return elementMap.get(elementId);
    },
    [elementMap]
  );

  // Build context value
  const contextValue = useMemo<GizmoContextValue>(
    () => ({
      // State
      activeGizmos,
      focusedGizmoAnimationId,
      gizmoEditMode,
      draggingHandle,
      viewport,

      // Actions
      activateGizmo,
      deactivateGizmo,
      deactivateAllGizmos,
      setFocusedGizmo: setFocusedGizmoAnimationId,
      setGizmoEditMode,
      updateGizmoState,
      focusGizmo: setFocusedGizmoAnimationId,
      updateGizmoProps: updateGizmoState,

      // Interaction
      startDrag,
      updateDrag,
      endDrag,

      // Queries
      getGizmoDefinition,
      getGizmoRenderContext,
      getAnimation,
      getElement,
      getElementBounds,
    }),
    [
      activeGizmos,
      focusedGizmoAnimationId,
      gizmoEditMode,
      draggingHandle,
      viewport,
      activateGizmo,
      deactivateGizmo,
      deactivateAllGizmos,
      setGizmoEditMode,
      updateGizmoState,
      startDrag,
      updateDrag,
      endDrag,
      getGizmoDefinition,
      getGizmoRenderContext,
      getAnimation,
      getElement,
      getElementBounds,
    ]
  );

  return <GizmoContext.Provider value={contextValue}>{children}</GizmoContext.Provider>;
}
