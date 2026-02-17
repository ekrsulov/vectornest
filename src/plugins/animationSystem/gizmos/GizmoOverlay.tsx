/**
 * Gizmo Overlay Component
 * 
 * Renders active gizmos as an SVG overlay layer on the canvas.
 * This component is responsible for:
 * - Rendering gizmo visuals (handles, guides, previews)
 * - Forwarding pointer events to interaction handler
 * - Updating on animation playback progress
 */

import React, { memo, useCallback, useMemo } from 'react';
import { useGizmoContextOptional } from './GizmoContext';
import { animationGizmoRegistry } from './registry/GizmoRegistry';
import type {
  GizmoHandle,
  GizmoRenderContext,
  GizmoContext,
  AnimationGizmoDefinition,
} from './types';
import type { Point } from '../../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the position from a handle, supporting both static and dynamic positions
 */
function getHandlePosition(handle: GizmoHandle, context: GizmoContext): Point {
  if (handle.getPosition) {
    return handle.getPosition(context);
  }
  if (typeof handle.position === 'function') {
    return handle.position(context);
  }
  return handle.position ?? { x: 0, y: 0 };
}

// =============================================================================
// Sub-Components
// =============================================================================

interface GizmoHandleRendererProps {
  handle: GizmoHandle;
  context: GizmoRenderContext;
  animationId: string;
  onDragStart: (animationId: string, handleId: string, point: Point) => void;
}

/**
 * Renders a single gizmo handle
 */
const GizmoHandleRenderer = memo(function GizmoHandleRenderer({
  handle,
  context,
  animationId,
  onDragStart,
}: GizmoHandleRendererProps) {
  const position = getHandlePosition(handle, context);
  const isActive = context.state.interaction?.activeHandle === handle.id;
  const isHovered = context.state.interaction?.hoveredHandle === handle.id;
  
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[GizmoHandle] pointerDown', {
        handleId: handle.id,
        animationId,
        clientX: e.clientX,
        clientY: e.clientY,
      });
      
      const point: Point = { x: e.clientX, y: e.clientY };
      onDragStart(animationId, handle.id, point);
    },
    [animationId, handle.id, onDragStart]
  );

  // Determine handle appearance based on type
  const getHandleStyle = () => {
    const baseSize = 8 / context.viewport.zoom;
    const strokeWidth = 1.5 / context.viewport.zoom;
    
    const colors = context.colorMode === 'dark'
      ? {
          primary: '#3B82F6',      // blue-500
          secondary: '#60A5FA',    // blue-400
          accent: '#F59E0B',       // amber-500
          fill: '#1E3A5F',
          stroke: '#60A5FA',
          active: '#FCD34D',
        }
      : {
          primary: '#2563EB',      // blue-600
          secondary: '#3B82F6',    // blue-500
          accent: '#D97706',       // amber-600
          fill: '#DBEAFE',
          stroke: '#2563EB',
          active: '#F59E0B',
        };

    return {
      size: baseSize,
      strokeWidth,
      colors,
      isActive,
      isHovered,
    };
  };

  const style = getHandleStyle();
  const cursor = handle.cursor ?? getCursorForHandle(handle.type);
  const labelText =
    typeof handle.label === 'function' ? handle.label(context) : handle.label;
  const normalizedLabel = labelText?.trim();
  const labelDigitCount = normalizedLabel
    ? normalizedLabel.replace(/[^0-9]/g, '').length
    : 0;
  const labelFontSize =
    labelDigitCount >= 3 ? style.size * 0.75 : style.size * 0.9;

  // Render based on handle type
  const renderHandle = () => {
    switch (handle.type) {
      case 'position':
      case 'point': // Point is similar to position
        return (
          <circle
            cx={position.x}
            cy={position.y}
            r={style.size}
            fill={style.isActive ? style.colors.active : style.colors.fill}
            stroke={style.isHovered ? style.colors.active : style.colors.stroke}
            strokeWidth={style.strokeWidth}
          />
        );

      case 'rotation':
      case 'arc': // Arc handle for rotation
        // Rotation handle: circle with arc indicator
        return (
          <g>
            <circle
              cx={position.x}
              cy={position.y}
              r={style.size}
              fill={style.isActive ? style.colors.active : style.colors.fill}
              stroke={style.colors.accent}
              strokeWidth={style.strokeWidth}
            />
            {!normalizedLabel && (
              <path
                d={`M ${position.x} ${position.y - style.size * 1.5} 
                    A ${style.size * 1.5} ${style.size * 1.5} 0 0 1 
                    ${position.x + style.size * 1.5} ${position.y}`}
                fill="none"
                stroke={style.colors.accent}
                strokeWidth={style.strokeWidth}
                strokeLinecap="round"
              />
            )}
          </g>
        );

      case 'scale':
        // Scale handle: square
        return (
          <rect
            x={position.x - style.size}
            y={position.y - style.size}
            width={style.size * 2}
            height={style.size * 2}
            fill={style.isActive ? style.colors.active : style.colors.fill}
            stroke={style.colors.stroke}
            strokeWidth={style.strokeWidth}
          />
        );

      case 'path':
        // Path handle: diamond
        return (
          <path
            d={`M ${position.x} ${position.y - style.size}
                L ${position.x + style.size} ${position.y}
                L ${position.x} ${position.y + style.size}
                L ${position.x - style.size} ${position.y}
                Z`}
            fill={style.isActive ? style.colors.active : style.colors.fill}
            stroke={style.colors.primary}
            strokeWidth={style.strokeWidth}
          />
        );

      case 'tangent':
        // Tangent handle: small circle with line
        return (
          <g>
            <circle
              cx={position.x}
              cy={position.y}
              r={style.size * 0.6}
              fill={style.colors.secondary}
              stroke={style.colors.stroke}
              strokeWidth={style.strokeWidth}
            />
          </g>
        );

      case 'timing':
        // Timing handle: horizontal bar
        return (
          <rect
            x={position.x - style.size * 1.5}
            y={position.y - style.size * 0.4}
            width={style.size * 3}
            height={style.size * 0.8}
            rx={style.size * 0.4}
            fill={style.colors.accent}
            stroke={style.colors.stroke}
            strokeWidth={style.strokeWidth}
          />
        );

      case 'value':
        // Value handle: vertical bar
        return (
          <rect
            x={position.x - style.size * 0.4}
            y={position.y - style.size * 1.5}
            width={style.size * 0.8}
            height={style.size * 3}
            rx={style.size * 0.4}
            fill={style.colors.secondary}
            stroke={style.colors.stroke}
            strokeWidth={style.strokeWidth}
          />
        );

      case 'custom':
      default:
        // Default: simple circle
        return (
          <circle
            cx={position.x}
            cy={position.y}
            r={style.size * 0.8}
            fill={style.colors.fill}
            stroke={style.colors.stroke}
            strokeWidth={style.strokeWidth}
          />
        );
    }
  };

  return (
    <g
      className="gizmo-handle"
      data-handle-id={handle.id}
      data-animation-id={animationId}
      style={{ cursor, pointerEvents: 'auto' }}
      onPointerDown={handlePointerDown}
    >
      {/* Hit area (larger than visual) */}
      <circle
        cx={position.x}
        cy={position.y}
        r={style.size * 2}
        fill="transparent"
        style={{ cursor, pointerEvents: 'auto' }}
      />
      {/* Visual */}
      {renderHandle()}
      {normalizedLabel && (
        <text
          x={position.x}
          y={position.y}
          fontSize={labelFontSize}
          fill={context.colorMode === 'dark' ? '#F9FAFB' : '#111827'}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="central"
          style={{ pointerEvents: 'none' }}
        >
          {normalizedLabel}
        </text>
      )}
    </g>
  );
});

// =============================================================================
// Single Gizmo Renderer
// =============================================================================

interface SingleGizmoRendererProps {
  animationId: string;
  definition: AnimationGizmoDefinition;
  context: GizmoRenderContext;
  onDragStart: (animationId: string, handleId: string, point: Point) => void;
}

const SingleGizmoRenderer = memo(function SingleGizmoRenderer({
  animationId,
  definition,
  context,
  onDragStart,
}: SingleGizmoRendererProps) {
  const isFocused = context.state.isFocused ?? false;

  const handles = useMemo(() => {
    return typeof definition.handles === 'function'
      ? definition.handles(context)
      : definition.handles;
  }, [definition, context]);

  // Get render function from definition (supports both formats)
  const renderContent = useMemo(() => {
    if (definition.render) {
      return definition.render(context);
    }
    if (definition.visual?.render) {
      return definition.visual.render(context);
    }
    return null;
  }, [definition, context]);

  return (
    <g
      className="gizmo-group"
      data-gizmo-id={definition.id}
      data-animation-id={animationId}
      opacity={isFocused ? 1 : 0.6}
    >
      {/* Render visual from definition */}
      {renderContent}

      {/* Render handles */}
      {handles
        .filter((handle) => {
          const visible = handle.visible;
          if (typeof visible === 'function') return visible(context);
          if (typeof visible === 'boolean') return visible;
          return true;
        })
        .map((handle) => (
          <GizmoHandleRenderer
            key={handle.id}
            handle={handle}
            context={context}
            animationId={animationId}
            onDragStart={onDragStart}
          />
        ))}
    </g>
  );
});

// =============================================================================
// Main Overlay Component
// =============================================================================

export interface GizmoOverlayProps {
  /** Additional class name */
  className?: string;
  /** Callback for drag start - connects to GizmoInteractionHandler */
  onDragStart?: (animationId: string, handleId: string, point: Point) => void;
}

/**
 * Main overlay component that renders all active gizmos
 */
export const GizmoOverlay = memo(function GizmoOverlay({
  className = '',
  onDragStart: onDragStartProp,
}: GizmoOverlayProps): React.ReactElement | null {
  const gizmoContext = useGizmoContextOptional();

  // Handle drag start - use provided callback or fallback to context
  const handleDragStart = useCallback(
    (animationId: string, handleId: string, point: Point) => {
      console.log('[GizmoOverlay] handleDragStart', {
        animationId,
        handleId,
        point,
        hasOnDragStartProp: !!onDragStartProp,
      });
      
      if (onDragStartProp) {
        // Use the interaction handler's drag start (properly tracks isDragging)
        onDragStartProp(animationId, handleId, point);
      } else {
        // Fallback to direct context call
        gizmoContext?.startDrag(animationId, handleId, point);
      }
    },
    [onDragStartProp, gizmoContext]
  );

  // Collect renderable gizmos
  const gizmosToRender = useMemo(() => {
    if (!gizmoContext) return [];

    const result: Array<{
      animationId: string;
      definition: AnimationGizmoDefinition;
      context: GizmoRenderContext;
    }> = [];

    gizmoContext.activeGizmos.forEach((gizmoState, animationId) => {
      const definition = animationGizmoRegistry.get(gizmoState.gizmoId);
      if (!definition) return;

      const renderContext = gizmoContext.getGizmoRenderContext(animationId);
      if (!renderContext) return;

      result.push({
        animationId,
        definition,
        context: renderContext,
      });
    });

    return result;
  }, [gizmoContext]);

  if (!gizmoContext || gizmosToRender.length === 0) {
    return null;
  }

  return (
    <g className={`gizmo-overlay ${className}`}>
      {gizmosToRender.map(({ animationId, definition, context }) => (
        <SingleGizmoRenderer
          key={animationId}
          animationId={animationId}
          definition={definition}
          context={context}
          onDragStart={handleDragStart}
        />
      ))}
    </g>
  );
});

// =============================================================================
// Standalone Overlay (with provider check)
// =============================================================================

/**
 * Standalone overlay that can be used outside GizmoProvider
 * Shows nothing if no provider is present
 */
export function GizmoOverlayStandalone(props: GizmoOverlayProps): React.ReactElement | null {
  const gizmoContext = useGizmoContextOptional();
  
  if (!gizmoContext) {
    return null;
  }

  return <GizmoOverlay {...props} />;
}

// =============================================================================
// Utility Functions
// =============================================================================

function getCursorForHandle(type: GizmoHandle['type']): string {
  switch (type) {
    case 'position':
    case 'point':
      return 'move';
    case 'rotation':
    case 'arc':
      return 'crosshair';
    case 'scale':
      return 'nwse-resize';
    case 'path':
      return 'pointer';
    case 'tangent':
      return 'pointer';
    case 'timing':
      return 'ew-resize';
    case 'value':
      return 'ns-resize';
    case 'custom':
    default:
      return 'pointer';
  }
}

// =============================================================================
// Export
// =============================================================================

export default GizmoOverlay;
