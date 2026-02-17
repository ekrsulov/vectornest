/**
 * Style Animation Gizmos
 * 
 * Gizmos for visual style animations:
 * - Stroke Width (08): Animate stroke thickness
 * - Color/Opacity (09): Animate colors and transparency
 * - ViewBox (10): Animate SVG viewBox (zoom/pan effect)
 */

import type {
  AnimationGizmoDefinition,
  GizmoState,
  GizmoHandle,
  GizmoContext,
} from '../types';
import { createDefaultInteraction } from '../types';
import type { SVGAnimation } from '../../types';

// =============================================================================
// SMIL Values Helpers
// =============================================================================

/**
 * Parse SMIL values attribute into array of keyframes (as strings for style values)
 * Example: "2;14;2" -> ["2", "14", "2"]
 * Example: "#ef4444;#22c55e;#3b82f6" -> ["#ef4444", "#22c55e", "#3b82f6"]
 */
function parseStyleValuesKeyframes(values: string | undefined): string[] {
  if (!values) return [];
  return values.split(';').map(v => v.trim());
}

/**
 * Format keyframes array back to SMIL values string
 */
function formatStyleValuesKeyframes(keyframes: string[]): string {
  return keyframes.join(';');
}

/**
 * Extract from/to values from style animation, supporting both from/to and values attributes
 */
function extractStyleAnimationValues(animation: SVGAnimation): {
  from: string;
  to: string;
  hasValues: boolean;
  keyframes: string[];
} {
  if (animation.values) {
    const keyframes = parseStyleValuesKeyframes(animation.values);
    const from = keyframes[0] ?? '';
    const to = keyframes[keyframes.length - 1] ?? '';
    return { from, to, hasValues: true, keyframes };
  }
  
  return {
    from: String(animation.from ?? ''),
    to: String(animation.to ?? ''),
    hasValues: false,
    keyframes: [],
  };
}

// =============================================================================
// Stroke Width Gizmo (08)
// =============================================================================

/**
 * Get active stroke width value for current keyframe
 */
function getActiveStrokeWidth(ctx: Pick<GizmoContext, 'state'>): number {
  const hasValues = ctx.state.props.hasValues as boolean;
  const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
  const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
  const fromWidth = (ctx.state.props.fromWidth as number) ?? 1;
  const toWidth = (ctx.state.props.toWidth as number) ?? 5;
  
  if (hasValues && keyframes.length > 0) {
    return parseFloat(keyframes[activeKeyframeIndex] || '1');
  }
  
  return activeKeyframeIndex === 0 ? fromWidth : toWidth;
}

/**
 * Generate handles for stroke-width - shows only active keyframe
 */
function createStrokeWidthHandles(ctx: GizmoContext): GizmoHandle[] {
  const hasValues = ctx.state.props.hasValues as boolean;
  const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
  const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
  const isFirst = activeKeyframeIndex === 0;
  const isLast = hasValues ? activeKeyframeIndex === keyframes.length - 1 : activeKeyframeIndex === 1;
  
  // Single handle for active keyframe
  return [
    {
      id: 'stroke-width-value',
      type: 'value',
      getPosition: (ctx) => {
        const widthValue = getActiveStrokeWidth(ctx);
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const width = maxX - minX;
        
        // Position based on active keyframe
        let xPos: number;
        if (isFirst) {
          xPos = minX - 20 / ctx.viewport.zoom;
        } else if (isLast) {
          xPos = maxX + 20 / ctx.viewport.zoom;
        } else {
          xPos = minX + (width * activeKeyframeIndex) / (keyframes.length - 1);
        }
        
        return { 
          x: xPos, 
          y: minY + height / 2 - widthValue * 2,
        };
      },
      onDrag: (delta, ctx) => {
        const currentWidth = getActiveStrokeWidth(ctx);
        const newWidth = Math.max(0.1, currentWidth - delta.y / 5);
        
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
        const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[activeKeyframeIndex] = String(newWidth);
          const updates: Record<string, unknown> = { keyframes: updatedKeyframes };
          if (activeKeyframeIndex === 0) updates.fromWidth = newWidth;
          if (activeKeyframeIndex === keyframes.length - 1) updates.toWidth = newWidth;
          ctx.updateState(updates);
        } else {
          // Simple from/to
          if (activeKeyframeIndex === 0) {
            ctx.updateState({ fromWidth: newWidth });
          } else {
            ctx.updateState({ toWidth: newWidth });
          }
        }
      },
      onDragEnd: (ctx) => {
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const fromWidth = ctx.state.props.fromWidth as number;
        const toWidth = ctx.state.props.toWidth as number;
        
        if (hasValues && keyframes.length > 0) {
          ctx.updateAnimation({
            values: formatStyleValuesKeyframes(keyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            from: String(fromWidth),
            to: String(toWidth),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: `Stroke Width: ${getActiveStrokeWidth(ctx).toFixed(1)}px`,
    },
  ];
}

export const strokeWidthGizmoDefinition: AnimationGizmoDefinition = {
  id: 'stroke-width',
  category: 'style',
  priority: 40,
  
  metadata: {
    name: 'Stroke Width',
    description: 'Animate stroke thickness over time',
    icon: 'minus',
  },
  
  handles: (ctx) => createStrokeWidthHandles(ctx),
  
  canHandle: (animation) => {
    return (
      animation.type === 'animate' &&
      animation.attributeName === 'stroke-width'
    );
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { from, to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    const fromWidth = parseFloat(from || '1');
    const toWidth = parseFloat(to || '5');
    
    return {
      gizmoId: 'stroke-width',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: {
        fromWidth,
        toWidth,
        hasValues,
        keyframes,
        activeKeyframeIndex: 0,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const fromWidth = state.props.fromWidth as number;
    const toWidth = state.props.toWidth as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[0] = String(fromWidth);
      updatedKeyframes[updatedKeyframes.length - 1] = String(toWidth);
      return {
        type: 'animate',
        attributeName: 'stroke-width',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'stroke-width',
      from: String(fromWidth),
      to: String(toWidth),
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const height = maxY - minY;
    const width = maxX - minX;
    const centerY = minY + height / 2;
    
    const hasValues = ctx.state.props.hasValues as boolean;
    const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
    const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
    const activeWidth = getActiveStrokeWidth(ctx);
    const strokeColor = colorMode === 'dark' ? '#F472B6' : '#DB2777';
    const numKeyframes = hasValues ? keyframes.length : 2;
    
    // Position for active indicator
    let xPos: number;
    if (activeKeyframeIndex === 0) {
      xPos = minX - 15 / viewport.zoom;
    } else if (activeKeyframeIndex === numKeyframes - 1) {
      xPos = maxX + 15 / viewport.zoom;
    } else {
      xPos = minX + (width * activeKeyframeIndex) / (numKeyframes - 1);
    }
    
    return (
      <g className="stroke-width-gizmo">
        {/* Active keyframe indicator line */}
        <line
          x1={xPos}
          y1={centerY - activeWidth * 2}
          x2={xPos}
          y2={centerY + activeWidth * 2}
          stroke={strokeColor}
          strokeWidth={activeWidth}
          strokeLinecap="round"
        />
        
        {/* Connecting arrow for reference */}
        <path
          d={`M ${minX - 5 / viewport.zoom} ${centerY} L ${maxX + 5 / viewport.zoom} ${centerY}`}
          stroke={strokeColor}
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${4 / viewport.zoom} ${2 / viewport.zoom}`}
          opacity={0.3}
        />
        
        {/* Label */}
        <text
          x={xPos}
          y={centerY + activeWidth * 2 + 12 / viewport.zoom}
          fontSize={9 / viewport.zoom}
          fill={colorMode === 'dark' ? '#9CA3AF' : '#6B7280'}
          textAnchor="middle"
        >
          {activeWidth.toFixed(1)}px (frame {activeKeyframeIndex + 1}/{numKeyframes})
        </text>
      </g>
    );
  },
};

// =============================================================================
// Opacity Gizmo (09)
// =============================================================================

/**
 * Get active opacity value for current keyframe
 */
function getActiveOpacity(ctx: Pick<GizmoContext, 'state'>): number {
  const hasValues = ctx.state.props.hasValues as boolean;
  const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
  const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
  const fromOpacity = (ctx.state.props.fromOpacity as number) ?? 1;
  const toOpacity = (ctx.state.props.toOpacity as number) ?? 0;
  
  if (hasValues && keyframes.length > 0) {
    return parseFloat(keyframes[activeKeyframeIndex] || '1');
  }
  
  return activeKeyframeIndex === 0 ? fromOpacity : toOpacity;
}

/**
 * Generate handles for opacity - shows only active keyframe
 */
function createOpacityHandles(ctx: GizmoContext): GizmoHandle[] {
  const hasValues = ctx.state.props.hasValues as boolean;
  const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
  const attributeName = (ctx.state.props.attributeName as string) ?? 'opacity';
  
  // Single handle for active keyframe
  return [
    {
      id: 'opacity-value',
      type: 'value',
      getPosition: (ctx) => {
        const { minX, maxX, maxY } = ctx.elementBounds;
        const width = maxX - minX;
        const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
        const numKeyframes = hasValues ? keyframes.length : 2;
        
        // Position along the track
        const xPos = minX + (width * activeKeyframeIndex) / (numKeyframes - 1);
        
        return {
          x: xPos,
          y: maxY + 24 / ctx.viewport.zoom,
        };
      },
      onDrag: (delta, ctx) => {
        const currentOpacity = getActiveOpacity(ctx);
        const newOpacity = Math.max(0, Math.min(1, currentOpacity - delta.y / 100));
        
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
        const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[activeKeyframeIndex] = String(newOpacity);
          const updates: Record<string, unknown> = { keyframes: updatedKeyframes };
          if (activeKeyframeIndex === 0) updates.fromOpacity = newOpacity;
          if (activeKeyframeIndex === keyframes.length - 1) updates.toOpacity = newOpacity;
          ctx.updateState(updates);
        } else {
          // Simple from/to
          if (activeKeyframeIndex === 0) {
            ctx.updateState({ fromOpacity: newOpacity });
          } else {
            ctx.updateState({ toOpacity: newOpacity });
          }
        }
      },
      onDragEnd: (ctx) => {
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const fromOpacity = ctx.state.props.fromOpacity as number;
        const toOpacity = ctx.state.props.toOpacity as number;
        
        if (hasValues && keyframes.length > 0) {
          ctx.updateAnimation({
            attributeName,
            values: formatStyleValuesKeyframes(keyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            attributeName,
            from: String(fromOpacity),
            to: String(toOpacity),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: `Opacity: ${(getActiveOpacity(ctx) * 100).toFixed(0)}%`,
    },
  ];
}

export const opacityGizmoDefinition: AnimationGizmoDefinition = {
  id: 'opacity',
  category: 'style',
  priority: 42,
  
  metadata: {
    name: 'Opacity',
    description: 'Animate element transparency',
    icon: 'eye',
    keyboardShortcut: 'O',
  },
  
  handles: (ctx) => createOpacityHandles(ctx),
  
  canHandle: (animation) => {
    return (
      animation.type === 'animate' &&
      (animation.attributeName === 'opacity' ||
       animation.attributeName === 'fill-opacity' ||
       animation.attributeName === 'stroke-opacity')
    );
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { from, to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    const fromOpacity = parseFloat(from || '1');
    const toOpacity = parseFloat(to || '0');
    
    return {
      gizmoId: 'opacity',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: {
        fromOpacity,
        toOpacity,
        currentOpacity: fromOpacity,
        attributeName: animation.attributeName,
        hasValues,
        keyframes,
        activeKeyframeIndex: 0,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const fromOpacity = state.props.fromOpacity as number;
    const toOpacity = state.props.toOpacity as number;
    const attributeName = (state.props.attributeName as string) ?? 'opacity';
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[0] = String(fromOpacity);
      updatedKeyframes[updatedKeyframes.length - 1] = String(toOpacity);
      return {
        type: 'animate',
        attributeName,
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName,
      from: String(fromOpacity),
      to: String(toOpacity),
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const width = maxX - minX;
    
    const hasValues = ctx.state.props.hasValues as boolean;
    const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
    const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
    const activeOpacity = getActiveOpacity(ctx);
    const numKeyframes = hasValues ? keyframes.length : 2;
    
    const trackColor = colorMode === 'dark' ? '#374151' : '#E5E7EB';
    const activeColor = colorMode === 'dark' ? '#60A5FA' : '#3B82F6';
    
    // Position for active marker
    const xPos = minX + (width * activeKeyframeIndex) / (numKeyframes - 1);
    
    return (
      <g className="opacity-gizmo">
        {/* Track background */}
        <rect
          x={minX}
          y={maxY + 20 / viewport.zoom}
          width={width}
          height={8 / viewport.zoom}
          fill={trackColor}
          rx={4 / viewport.zoom}
        />
        
        {/* Active keyframe marker */}
        <circle
          cx={xPos}
          cy={maxY + 24 / viewport.zoom}
          r={6 / viewport.zoom}
          fill={activeColor}
          stroke={colorMode === 'dark' ? '#1F2937' : '#F3F4F6'}
          strokeWidth={1.5 / viewport.zoom}
        />
        
        {/* Label */}
        <text
          x={xPos}
          y={maxY + 38 / viewport.zoom}
          fontSize={9 / viewport.zoom}
          fill={colorMode === 'dark' ? '#9CA3AF' : '#6B7280'}
          textAnchor="middle"
        >
          {Math.round(activeOpacity * 100)}% (frame {activeKeyframeIndex + 1}/{numKeyframes})
        </text>
      </g>
    );
  },
};

// =============================================================================
// Color Gizmo (09b)
// =============================================================================

/**
 * Get active color value for current keyframe
 */
function getActiveColor(ctx: Pick<GizmoContext, 'state'>): string {
  const hasValues = ctx.state.props.hasValues as boolean;
  const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
  const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
  const fromColor = (ctx.state.props.fromColor as string) ?? '#000000';
  const toColor = (ctx.state.props.toColor as string) ?? '#FFFFFF';
  
  if (hasValues && keyframes.length > 0) {
    return keyframes[activeKeyframeIndex] ?? '#000000';
  }
  
  return activeKeyframeIndex === 0 ? fromColor : toColor;
}

/**
 * Generate handles for color - shows only active keyframe
 */
function createColorHandles(ctx: GizmoContext): GizmoHandle[] {
  const hasValues = ctx.state.props.hasValues as boolean;
  const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
  
  // Single handle for active keyframe (visual marker, not draggable)
  return [
    {
      id: 'color-value',
      type: 'value',
      getPosition: (ctx) => {
        const { minX, maxX, maxY } = ctx.elementBounds;
        const width = maxX - minX;
        const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
        const numKeyframes = hasValues ? keyframes.length : 2;
        
        // Position along the gradient track
        const xPos = minX + (width * activeKeyframeIndex) / (numKeyframes - 1);
        
        return {
          x: xPos,
          y: maxY + 26 / ctx.viewport.zoom,
        };
      },
      onDrag: (_delta, _ctx) => {
        // Color editing not implemented in drag - would need color picker
        // For now, handle is just a visual indicator
      },
      onDragEnd: (_ctx) => {
        // Could open color picker here in the future
      },
      cursor: 'pointer',
      tooltip: `Color: ${getActiveColor(ctx)}`,
    },
  ];
}

export const colorGizmoDefinition: AnimationGizmoDefinition = {
  id: 'color',
  category: 'style',
  priority: 41,
  
  metadata: {
    name: 'Color',
    description: 'Animate fill or stroke color',
    icon: 'palette',
    keyboardShortcut: 'C',
  },
  
  handles: (ctx) => createColorHandles(ctx),
  
  canHandle: (animation) => {
    return (
      animation.type === 'animate' &&
      (animation.attributeName === 'fill' ||
       animation.attributeName === 'stroke')
    );
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { from, to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'color',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: {
        fromColor: from || '#000000',
        toColor: to || '#FFFFFF',
        colorBlend: 0,
        attributeName: animation.attributeName,
        hasValues,
        keyframes,
        activeKeyframeIndex: 0,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const fromColor = state.props.fromColor as string;
    const toColor = state.props.toColor as string;
    const attributeName = state.props.attributeName as string;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[0] = fromColor;
      updatedKeyframes[updatedKeyframes.length - 1] = toColor;
      return {
        type: 'animate',
        attributeName,
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName,
      from: fromColor,
      to: toColor,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const width = maxX - minX;
    
    const hasValues = ctx.state.props.hasValues as boolean;
    const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
    const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
    const activeColor = getActiveColor(ctx);
    const numKeyframes = hasValues ? keyframes.length : 2;
    
    // Calculate gradient stops for visual reference
    const fromColor = (ctx.state.props.fromColor as string) ?? '#000000';
    const toColor = (ctx.state.props.toColor as string) ?? '#FFFFFF';
    const gradientStops = hasValues && keyframes.length > 2
      ? keyframes.map((color, i) => ({
          offset: `${(i / (keyframes.length - 1)) * 100}%`,
          color,
        }))
      : [
          { offset: '0%', color: fromColor },
          { offset: '100%', color: toColor },
        ];
    
    // Generate unique gradient ID for this animation
    const gradientId = `color-gradient-${ctx.animation.id}`;
    
    // Position for active marker
    const xPos = minX + (width * activeKeyframeIndex) / (numKeyframes - 1);
    
    return (
      <g className="color-gizmo">
        {/* Color gradient track for reference */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientStops.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>
        </defs>
        
        {/* Track with gradient */}
        <rect
          x={minX}
          y={maxY + 20 / viewport.zoom}
          width={width}
          height={12 / viewport.zoom}
          fill={`url(#${gradientId})`}
          rx={6 / viewport.zoom}
          stroke={colorMode === 'dark' ? '#4B5563' : '#D1D5DB'}
          strokeWidth={1 / viewport.zoom}
          opacity={0.5}
        />
        
        {/* Active keyframe color swatch */}
        <circle
          cx={xPos}
          cy={maxY + 26 / viewport.zoom}
          r={8 / viewport.zoom}
          fill={activeColor}
          stroke={colorMode === 'dark' ? '#F9FAFB' : '#111827'}
          strokeWidth={1.5 / viewport.zoom}
        />
        
        {/* Label */}
        <text
          x={xPos}
          y={maxY + 42 / viewport.zoom}
          fontSize={9 / viewport.zoom}
          fill={colorMode === 'dark' ? '#9CA3AF' : '#6B7280'}
          textAnchor="middle"
        >
          {activeColor} (frame {activeKeyframeIndex + 1}/{numKeyframes})
        </text>
      </g>
    );
  },
};

// =============================================================================
// Registration
// =============================================================================

export const styleGizmos = [
  strokeWidthGizmoDefinition,
  opacityGizmoDefinition,
  colorGizmoDefinition,
];
