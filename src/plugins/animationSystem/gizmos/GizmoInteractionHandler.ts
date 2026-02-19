/**
 * Gizmo Interaction Handler
 * 
 * Manages pointer events for gizmo interactions.
 * This module handles:
 * - Drag operations on gizmo handles
 * - Keyboard modifiers (shift, alt, etc.)
 * - Coordinate transformations
 * - Event delegation
 */

import type { Point } from '../../../types';
import type { GizmoContextValue } from './GizmoContext';

// =============================================================================
// Types
// =============================================================================

interface GizmoInteractionHandlerConfig {
  /** SVG element for coordinate transformation */
  svgElement: SVGSVGElement | null;
  /** Gizmo context for state and actions */
  gizmoContext: GizmoContextValue;
  /** Whether interactions are enabled */
  enabled: boolean;
}

export interface ModifierState {
  shift: boolean;
  alt: boolean;
  meta: boolean;
  ctrl: boolean;
}

// =============================================================================
// Class
// =============================================================================

class GizmoInteractionHandler {
  private config: GizmoInteractionHandlerConfig;
  private isDragging: boolean = false;
  private modifiers: ModifierState = {
    shift: false,
    alt: false,
    meta: false,
    ctrl: false,
  };

  constructor(config: GizmoInteractionHandlerConfig) {
    this.config = config;
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GizmoInteractionHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Start listening for drag events
   */
  startListening(): void {
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Stop listening for events
   */
  stopListening(): void {
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Handle drag start from a gizmo handle
   */
  handleDragStart(animationId: string, handleId: string, clientPoint: Point): void {
    console.log('[GizmoInteractionHandler] handleDragStart', {
      animationId,
      handleId,
      clientPoint,
      enabled: this.config.enabled,
    });
    
    if (!this.config.enabled) {
      console.log('[GizmoInteractionHandler] BLOCKED - not enabled');
      return;
    }

    this.isDragging = true;
    const canvasPoint = this.clientToCanvas(clientPoint);
    console.log('[GizmoInteractionHandler] starting drag', { canvasPoint, isDragging: this.isDragging });
    this.config.gizmoContext.startDrag(animationId, handleId, canvasPoint);
  }

  /**
   * Handle pointer move during drag
   */
  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDragging || !this.config.enabled) {
      return;
    }

    console.log('[GizmoInteractionHandler] handlePointerMove', { x: e.clientX, y: e.clientY });
    
    this.updateModifiers(e);
    const clientPoint: Point = { x: e.clientX, y: e.clientY };
    const canvasPoint = this.clientToCanvas(clientPoint);
    
    this.config.gizmoContext.updateDrag(canvasPoint, this.modifiers);
  }

  /**
   * Handle pointer up to end drag
   */
  private handlePointerUp(_e: PointerEvent): void {
    if (!this.isDragging) return;

    console.log('[GizmoInteractionHandler] handlePointerUp - ending drag');
    this.isDragging = false;
    this.config.gizmoContext.endDrag();
  }

  /**
   * Handle key down for modifiers
   */
  private handleKeyDown(e: KeyboardEvent): void {
    const changed = this.updateModifiersFromKeyboard(e);
    
    // If dragging and modifiers changed, update drag
    if (this.isDragging && changed) {
      // Modifiers will be used on next pointer move
    }

    // Handle escape to cancel drag
    if (e.key === 'Escape' && this.isDragging) {
      this.isDragging = false;
      this.config.gizmoContext.endDrag();
    }
  }

  /**
   * Handle key up for modifiers
   */
  private handleKeyUp(e: KeyboardEvent): void {
    this.updateModifiersFromKeyboard(e);
  }

  /**
   * Update modifiers from pointer event
   */
  private updateModifiers(e: PointerEvent | MouseEvent): void {
    this.modifiers = {
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
      ctrl: e.ctrlKey,
    };
  }

  /**
   * Update modifiers from keyboard event
   * Returns true if modifiers changed
   */
  private updateModifiersFromKeyboard(e: KeyboardEvent): boolean {
    const prev = { ...this.modifiers };
    
    this.modifiers = {
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
      ctrl: e.ctrlKey,
    };

    return (
      prev.shift !== this.modifiers.shift ||
      prev.alt !== this.modifiers.alt ||
      prev.meta !== this.modifiers.meta ||
      prev.ctrl !== this.modifiers.ctrl
    );
  }

  /**
   * Convert client coordinates to canvas coordinates
   * Uses the same formula as pointUtils.clientToCanvas
   */
  private clientToCanvas(clientPoint: Point): Point {
    const { svgElement } = this.config;
    
    if (!svgElement) {
      return clientPoint;
    }

    const { viewport } = this.config.gizmoContext;
    const rect = svgElement.getBoundingClientRect();

    // Match the formula from pointUtils.ts exactly:
    // canvasX = (screenX - rect.left - viewport.panX) / viewport.zoom
    const x = (clientPoint.x - rect.left - viewport.panX) / viewport.zoom;
    const y = (clientPoint.y - rect.top - viewport.panY) / viewport.zoom;

    return { x, y };
  }

  /**
   * Check if currently dragging
   */
  get dragging(): boolean {
    return this.isDragging;
  }

  /**
   * Get current modifiers
   */
  get currentModifiers(): ModifierState {
    return { ...this.modifiers };
  }
}

// =============================================================================
// React Hook
// =============================================================================

import { useEffect, useRef, useCallback } from 'react';
import { useGizmoContext } from './GizmoContext';

interface UseGizmoInteractionOptions {
  /** SVG element ref */
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** Whether interactions are enabled */
  enabled?: boolean;
}

/**
 * React hook for managing gizmo interactions
 */
export function useGizmoInteraction({
  svgRef,
  enabled = true,
}: UseGizmoInteractionOptions) {
  const gizmoContext = useGizmoContext();
  const handlerRef = useRef<GizmoInteractionHandler | null>(null);
  
  // Use refs to avoid recreating handler when context changes
  const gizmoContextRef = useRef(gizmoContext);
  const enabledRef = useRef(enabled);
  
  // Keep refs updated
  useEffect(() => {
    gizmoContextRef.current = gizmoContext;
  }, [gizmoContext]);
  
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Initialize handler ONCE
  useEffect(() => {
    // Create a proxy config that always uses current refs
    const handler = new GizmoInteractionHandler({
      svgElement: svgRef.current,
      gizmoContext: gizmoContextRef.current,
      enabled: enabledRef.current,
    });

    handlerRef.current = handler;
    handler.startListening();

    return () => {
      handler.stopListening();
      handlerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update config when props change (without recreating handler)
  useEffect(() => {
    if (handlerRef.current) {
      handlerRef.current.updateConfig({
        svgElement: svgRef.current,
        gizmoContext,
        enabled,
      });
    }
  }, [svgRef, gizmoContext, enabled]);

  // Handle drag start callback
  const handleDragStart = useCallback(
    (animationId: string, handleId: string, point: Point) => {
      console.log('[useGizmoInteraction] handleDragStart called', { 
        hasHandler: !!handlerRef.current,
        animationId 
      });
      handlerRef.current?.handleDragStart(animationId, handleId, point);
    },
    []
  );

  return {
    handleDragStart,
    isDragging: handlerRef.current?.dragging ?? false,
  };
}

// =============================================================================
// Utility: Constraint Helpers
// =============================================================================

/**
 * Constrain movement to axis when shift is held
 */
export function constrainToAxis(
  delta: Point,
  modifiers: ModifierState
): Point {
  if (!modifiers.shift) return delta;

  // Constrain to dominant axis
  if (Math.abs(delta.x) > Math.abs(delta.y)) {
    return { x: delta.x, y: 0 };
  } else {
    return { x: 0, y: delta.y };
  }
}

/**
 * Snap to grid when enabled
 */
export function snapToGrid(
  point: Point,
  gridSize: number,
  enabled: boolean
): Point {
  if (!enabled || gridSize <= 0) return point;

  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * Constrain rotation to 15-degree increments when shift is held
 */
export function constrainRotation(
  angle: number,
  modifiers: ModifierState,
  increment: number = 15
): number {
  if (!modifiers.shift) return angle;

  return Math.round(angle / increment) * increment;
}

/**
 * Constrain scale to uniform when shift is held
 */
export function constrainUniformScale(
  scaleX: number,
  scaleY: number,
  modifiers: ModifierState
): { scaleX: number; scaleY: number } {
  if (!modifiers.shift) return { scaleX, scaleY };

  // Use the larger scale for both axes
  const uniformScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
  const signX = scaleX >= 0 ? 1 : -1;
  const signY = scaleY >= 0 ? 1 : -1;

  return {
    scaleX: uniformScale * signX,
    scaleY: uniformScale * signY,
  };
}

