/**
 * Gizmo Overlay Component
 * 
 * Renders active gizmos as an SVG overlay layer on the canvas.
 * This component is responsible for:
 * - Rendering gizmo visuals (handles, guides, previews)
 * - Forwarding pointer events to interaction handler
 * - Updating on animation playback progress
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
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
// Constants
// =============================================================================

/** Reusable style to disable pointer events on decorative SVG elements. */
const NO_POINTER_EVENTS: React.CSSProperties = { pointerEvents: 'none' };

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

interface HandleVisualProps {
  type: GizmoHandle['type'];
  position: Point;
  size: number;
  strokeWidth: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    fill: string;
    stroke: string;
    active: string;
  };
  isActive: boolean;
  isHovered: boolean;
  hasLabel: boolean;
}

function getResponsiveScreenSize(
  basePx: number,
  zoom: number,
  minPx: number,
  maxPx: number
): number {
  const safeZoom = Math.max(zoom, 0.01);
  const zoomDelta = Math.log2(safeZoom);
  const responsivePx = basePx + zoomDelta * 2.5;
  return Math.max(minPx, Math.min(maxPx, responsivePx));
}

function HandleVisual({
  type,
  position,
  size,
  strokeWidth,
  colors,
  isActive,
  isHovered,
  hasLabel,
}: HandleVisualProps): React.ReactElement {
  // Scale up slightly on hover/active for visual feedback
  const scale = isActive ? 1.25 : isHovered ? 1.15 : 1;
  const adjustedSize = size * scale;
  const adjustedStrokeWidth = strokeWidth * (isActive ? 1.4 : isHovered ? 1.2 : 1);

  // Resolve fill/stroke for hover & active states
  const fillColor = isActive ? colors.active : isHovered ? colors.stroke : colors.fill;
  const strokeColor = isActive ? colors.active : isHovered ? colors.active : colors.stroke;

  switch (type) {
    case 'position':
    case 'point':
      return (
        <circle
          cx={position.x}
          cy={position.y}
          r={adjustedSize}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={adjustedStrokeWidth}
        />
      );

    case 'rotation':
    case 'arc':
      return (
        <g>
          <circle
            cx={position.x}
            cy={position.y}
            r={adjustedSize}
            fill={isActive ? colors.active : isHovered ? colors.accent : colors.fill}
            stroke={colors.accent}
            strokeWidth={adjustedStrokeWidth}
          />
          {!hasLabel && (
            <path
              d={`M ${position.x} ${position.y - adjustedSize * 1.5} 
                  A ${adjustedSize * 1.5} ${adjustedSize * 1.5} 0 0 1 
                  ${position.x + adjustedSize * 1.5} ${position.y}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth={adjustedStrokeWidth}
              strokeLinecap="round"
              style={NO_POINTER_EVENTS}
            />
          )}
        </g>
      );

    case 'scale':
      return (
        <rect
          x={position.x - adjustedSize}
          y={position.y - adjustedSize}
          width={adjustedSize * 2}
          height={adjustedSize * 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={adjustedStrokeWidth}
        />
      );

    case 'path':
      return (
        <path
          d={`M ${position.x} ${position.y - adjustedSize}
              L ${position.x + adjustedSize} ${position.y}
              L ${position.x} ${position.y + adjustedSize}
              L ${position.x - adjustedSize} ${position.y}
              Z`}
          fill={fillColor}
          stroke={isActive ? colors.active : colors.primary}
          strokeWidth={adjustedStrokeWidth}
        />
      );

    case 'tangent':
      return (
        <circle
          cx={position.x}
          cy={position.y}
          r={adjustedSize * 0.6}
          fill={isHovered ? colors.primary : colors.secondary}
          stroke={strokeColor}
          strokeWidth={adjustedStrokeWidth}
        />
      );

    case 'timing':
      return (
        <rect
          x={position.x - adjustedSize * 1.5}
          y={position.y - adjustedSize * 0.4}
          width={adjustedSize * 3}
          height={adjustedSize * 0.8}
          rx={adjustedSize * 0.4}
          fill={isHovered ? colors.primary : colors.accent}
          stroke={strokeColor}
          strokeWidth={adjustedStrokeWidth}
        />
      );

    case 'value':
      return (
        <rect
          x={position.x - adjustedSize * 0.4}
          y={position.y - adjustedSize * 1.5}
          width={adjustedSize * 0.8}
          height={adjustedSize * 3}
          rx={adjustedSize * 0.4}
          fill={isHovered ? colors.primary : colors.secondary}
          stroke={strokeColor}
          strokeWidth={adjustedStrokeWidth}
        />
      );

    case 'origin':
      return (
        <g>
          <circle
            cx={position.x}
            cy={position.y}
            r={adjustedSize}
            fill="none"
            stroke={strokeColor}
            strokeWidth={adjustedStrokeWidth}
          />
          <line
            x1={position.x - adjustedSize * 1.4}
            y1={position.y}
            x2={position.x + adjustedSize * 1.4}
            y2={position.y}
            stroke={strokeColor}
            strokeWidth={adjustedStrokeWidth * 0.7}
            style={NO_POINTER_EVENTS}
          />
          <line
            x1={position.x}
            y1={position.y - adjustedSize * 1.4}
            x2={position.x}
            y2={position.y + adjustedSize * 1.4}
            stroke={strokeColor}
            strokeWidth={adjustedStrokeWidth * 0.7}
            style={NO_POINTER_EVENTS}
          />
        </g>
      );

    case 'custom':
    default:
      return (
        <circle
          cx={position.x}
          cy={position.y}
          r={adjustedSize * 0.8}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={adjustedStrokeWidth}
        />
      );
  }
}

interface GizmoHandleRendererProps {
  handle: GizmoHandle;
  context: GizmoRenderContext;
  animationId: string;
  onDragStart: (animationId: string, handleId: string, point: Point) => void;
}

/**
 * Renders a single gizmo handle with hover tracking and tooltip
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
  const [localHover, setLocalHover] = useState(false);
  const hovered = isHovered || localHover;
  
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const point: Point = { x: e.clientX, y: e.clientY };
      onDragStart(animationId, handle.id, point);
    },
    [animationId, handle.id, onDragStart]
  );

  const handlePointerEnter = useCallback(() => setLocalHover(true), []);
  const handlePointerLeave = useCallback(() => setLocalHover(false), []);
  const isRotateHandle =
    context.state.gizmoId === 'rotate' &&
    (handle.type === 'arc' || handle.type === 'rotation');

  // Determine handle appearance based on type
  const getHandleStyle = () => {
    const baseScreenSize = isRotateHandle
      ? getResponsiveScreenSize(13, context.viewport.zoom, 11.5, 18)
      : 8;
    const baseSize = baseScreenSize / context.viewport.zoom;
    const strokeWidth = (isRotateHandle ? 1.8 : 1.5) / context.viewport.zoom;

    const defaultColors = context.colorMode === 'dark'
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

    const translateColors = context.colorMode === 'dark'
      ? {
          primary: '#F8FAFC',
          secondary: '#E2E8F0',
          accent: '#CBD5E1',
          fill: '#F8FAFC',
          stroke: '#CBD5E1',
          active: '#FFFFFF',
        }
      : {
          primary: '#111827',
          secondary: '#1F2937',
          accent: '#374151',
          fill: '#6B7280',
          stroke: '#111827',
          active: '#030712',
        };

    const rotateColors = context.colorMode === 'dark'
      ? {
          primary: '#F8FAFC',
          secondary: '#E5E7EB',
          accent: '#D1D5DB',
          fill: '#F3F4F6',
          stroke: '#D1D5DB',
          active: '#FFFFFF',
        }
      : {
          primary: '#111827',
          secondary: '#1F2937',
          accent: '#374151',
          fill: '#9CA3AF',
          stroke: '#111827',
          active: '#030712',
        };

    const scaleColors = context.colorMode === 'dark'
      ? {
          primary: '#F8FAFC',
          secondary: '#E5E7EB',
          accent: '#D1D5DB',
          fill: '#F3F4F6',
          stroke: '#D1D5DB',
          active: '#FFFFFF',
        }
      : {
          primary: '#111827',
          secondary: '#1F2937',
          accent: '#374151',
          fill: '#D1D5DB',
          stroke: '#111827',
          active: '#030712',
        };

    const skewColors = context.colorMode === 'dark'
      ? {
          primary: '#F8FAFC',
          secondary: '#E5E7EB',
          accent: '#D1D5DB',
          fill: '#CBD5E1',
          stroke: '#F8FAFC',
          active: '#FFFFFF',
        }
      : {
          primary: '#111827',
          secondary: '#374151',
          accent: '#4B5563',
          fill: '#9CA3AF',
          stroke: '#111827',
          active: '#030712',
        };

    const opacityColors = context.colorMode === 'dark'
      ? {
          primary: '#F8FAFC',
          secondary: '#E5E7EB',
          accent: '#D1D5DB',
          fill: '#CBD5E1',
          stroke: '#F8FAFC',
          active: '#FFFFFF',
        }
      : {
          primary: '#111827',
          secondary: '#374151',
          accent: '#4B5563',
          fill: '#9CA3AF',
          stroke: '#111827',
          active: '#030712',
        };

    const blurColors = context.colorMode === 'dark'
      ? {
          primary: '#F8FAFC',
          secondary: '#E5E7EB',
          accent: '#D1D5DB',
          fill: '#CBD5E1',
          stroke: '#F8FAFC',
          active: '#FFFFFF',
        }
      : {
          primary: '#111827',
          secondary: '#374151',
          accent: '#4B5563',
          fill: '#9CA3AF',
          stroke: '#111827',
          active: '#030712',
        };

    const strokeDrawColors = context.colorMode === 'dark'
      ? {
          primary: '#F8FAFC',
          secondary: '#E5E7EB',
          accent: '#D1D5DB',
          fill: '#CBD5E1',
          stroke: '#F8FAFC',
          active: '#FFFFFF',
        }
      : {
          primary: '#111827',
          secondary: '#374151',
          accent: '#4B5563',
          fill: '#9CA3AF',
          stroke: '#111827',
          active: '#030712',
        };

    const colors = context.state.gizmoId === 'translate'
      ? translateColors
      : context.state.gizmoId === 'rotate'
        ? rotateColors
        : context.state.gizmoId === 'scale'
          ? scaleColors
          : context.state.gizmoId === 'skew'
            ? skewColors
          : context.state.gizmoId === 'opacity'
            ? opacityColors
            : context.state.gizmoId === 'blur'
              ? blurColors
            : context.state.gizmoId === 'stroke-draw'
              ? strokeDrawColors
            : defaultColors;

    return {
      size: baseSize,
      strokeWidth,
      colors,
      isActive,
      isHovered: hovered,
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
  const isRotateAngleLabel =
    context.state.gizmoId === 'rotate' &&
    (handle.type === 'arc' || handle.type === 'rotation');
  const rotateLabelScreenSize = getResponsiveScreenSize(10, context.viewport.zoom, 10.5, 16.5);
  const labelFontSize =
    isRotateAngleLabel
      ? (
          (rotateLabelScreenSize / context.viewport.zoom) *
          (labelDigitCount >= 3 ? 0.95 : 1.05)
        )
      : (labelDigitCount >= 3 ? style.size * 0.75 : style.size * 0.9);
  const labelFill = isRotateAngleLabel
    ? (
        context.colorMode === 'dark'
          ? '#0F172A'
          : (style.isActive || style.isHovered ? '#F9FAFB' : '#111827')
      )
    : (context.colorMode === 'dark' ? '#F9FAFB' : '#111827');
  const labelStroke = isRotateAngleLabel
    ? (
        context.colorMode === 'dark'
          ? '#F8FAFC'
          : (style.isActive || style.isHovered ? '#030712' : '#F9FAFB')
      )
    : 'none';

  // Tooltip text: use handle's tooltip prop, then fall back to label
  const tooltipText = handle.tooltip ?? normalizedLabel;
  const tooltipFontSize = 10 / context.viewport.zoom;
  const tooltipOffsetY = context.state.gizmoId === 'opacity'
    ? style.size * 3.8
    : context.state.gizmoId === 'stroke-draw'
      ? style.size * 4.2
    : style.size * 2.5;
  const tooltipPaddingX = tooltipFontSize * 0.7;
  const tooltipPaddingY = tooltipFontSize * 0.45;
  const tooltipWidth = tooltipText
    ? tooltipText.length * tooltipFontSize * 0.58 + tooltipPaddingX * 2
    : 0;
  const tooltipHeight = tooltipFontSize + tooltipPaddingY * 2;
  const tooltipCenterY = position.y - tooltipOffsetY - tooltipHeight / 2;
  const tooltipColors = context.colorMode === 'dark'
    ? {
        fill: '#F8FAFC',
        stroke: '#CBD5E1',
        text: '#0F172A',
      }
    : {
        fill: '#0F172A',
        stroke: '#334155',
        text: '#F8FAFC',
      };

  return (
    <g
      className="gizmo-handle"
      data-handle-id={handle.id}
      data-animation-id={animationId}
      style={{ cursor, pointerEvents: 'auto' }}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
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
      <HandleVisual
        type={handle.type}
        position={position}
        size={style.size}
        strokeWidth={style.strokeWidth}
        colors={style.colors}
        isActive={style.isActive}
        isHovered={style.isHovered}
        hasLabel={!!normalizedLabel}
      />
      {normalizedLabel && (
        <text
          x={position.x}
          y={position.y}
          fontSize={labelFontSize}
          fill={labelFill}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="central"
          stroke={labelStroke}
          strokeWidth={isRotateAngleLabel ? 1 / context.viewport.zoom : undefined}
          paintOrder={isRotateAngleLabel ? 'stroke fill' : undefined}
          style={NO_POINTER_EVENTS}
        >
          {normalizedLabel}
        </text>
      )}
      {/* Tooltip on hover (only when not dragging and not already showing label) */}
      {hovered && !isActive && tooltipText && !normalizedLabel && (
        <g style={NO_POINTER_EVENTS}>
          <rect
            x={position.x - tooltipWidth / 2}
            y={tooltipCenterY - tooltipHeight / 2}
            width={tooltipWidth}
            height={tooltipHeight}
            rx={3 / context.viewport.zoom}
            fill={tooltipColors.fill}
            stroke={tooltipColors.stroke}
            strokeWidth={1 / context.viewport.zoom}
            opacity={0.98}
          />
          <text
            x={position.x}
            y={tooltipCenterY}
            fontSize={tooltipFontSize}
            fill={tooltipColors.text}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="600"
          >
            {tooltipText}
          </text>
        </g>
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

interface GizmoOverlayProps {
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
      {/* Shared SVG marker definitions for gizmo visuals */}
      <defs>
        {/* Arrow marker used by trajectory lines */}
        <marker
          id="gizmo-arrow-light"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="#111827" />
        </marker>
        <marker
          id="gizmo-arrow-dark"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="#F8FAFC" />
        </marker>
        {/* Generic arrowhead (used by scene/typography gizmos) */}
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="currentColor" />
        </marker>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="currentColor" />
        </marker>
      </defs>
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
