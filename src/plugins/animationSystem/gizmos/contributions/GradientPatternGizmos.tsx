/**
 * Gradient & Pattern Animation Gizmos
 * 
 * Gizmos for gradient and pattern animations:
 * - Linear Gradient (14): Animate gradient direction and stops
 * - Radial Gradient (15): Animate radial gradient center/radius
 * - Pattern Transform (16): Animate pattern transformations
 * - Gradient Stops (17): Animate color stop positions
 */

import type {
  AnimationGizmoDefinition,
  GizmoState,
} from '../types';
import { createDefaultInteraction } from '../types';
import type { SVGAnimation } from '../../types';
import type { Point } from '../../../../types';

// =============================================================================
// SMIL Values Helpers
// =============================================================================

/**
 * Parse SMIL values attribute into array of keyframes (as strings)
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
 * Extract from/to values from animation, supporting both from/to and values attributes
 */
function extractStyleAnimationValues(animation: SVGAnimation): {
  from: string;
  to: string;
  hasValues: boolean;
  keyframes: string[];
} {
  if (animation.values) {
    const keyframes = parseStyleValuesKeyframes(animation.values);
    return { 
      from: keyframes[0] ?? '', 
      to: keyframes[keyframes.length - 1] ?? '', 
      hasValues: true, 
      keyframes 
    };
  }
  return {
    from: String(animation.from ?? ''),
    to: String(animation.to ?? ''),
    hasValues: false,
    keyframes: [],
  };
}

// =============================================================================
// Linear Gradient Gizmo (14)
// =============================================================================

const linearGradientGizmoDefinition: AnimationGizmoDefinition = {
  id: 'linear-gradient',
  category: 'gradient-pattern',
  priority: 50,
  
  metadata: {
    name: 'Linear Gradient',
    description: 'Animate linear gradient angle and position',
    icon: 'arrow-up-right',
  },
  
  handles: [
    {
      id: 'gradient-start',
      type: 'position',
      getPosition: (ctx) => {
        const angle = (ctx.state.props.angle as number) ?? 0;
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rad = (angle * Math.PI) / 180;
        const dist = Math.min(maxX - minX, maxY - minY) / 2;
        return { x: cx - Math.cos(rad) * dist, y: cy - Math.sin(rad) * dist };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const pos = ctx.state.props.startPos as Point ?? { x: cx, y: cy };
        const newPos = { x: pos.x + delta.x, y: pos.y + delta.y };
        const angle = Math.atan2(cy - newPos.y, cx - newPos.x) * (180 / Math.PI);
        ctx.updateState({ angle, startPos: newPos });
      },
      onDragEnd: (ctx) => {
        const angle = ctx.state.props.angle as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = `rotate(${angle})`;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'gradientTransform',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'gradientTransform',
            to: `rotate(${angle})`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Gradient Start',
    },
    {
      id: 'gradient-end',
      type: 'position',
      getPosition: (ctx) => {
        const angle = (ctx.state.props.angle as number) ?? 0;
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rad = (angle * Math.PI) / 180;
        const dist = Math.min(maxX - minX, maxY - minY) / 2;
        return { x: cx + Math.cos(rad) * dist, y: cy + Math.sin(rad) * dist };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const pos = ctx.state.props.endPos as Point ?? { x: cx, y: cy };
        const newPos = { x: pos.x + delta.x, y: pos.y + delta.y };
        const angle = Math.atan2(newPos.y - cy, newPos.x - cx) * (180 / Math.PI);
        ctx.updateState({ angle, endPos: newPos });
      },
      onDragEnd: (ctx) => {
        const angle = ctx.state.props.angle as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = `rotate(${angle})`;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'gradientTransform',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'gradientTransform',
            to: `rotate(${angle})`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Gradient End',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && 
      (animation.attributeName === 'x1' || animation.attributeName === 'x2' ||
       animation.attributeName === 'y1' || animation.attributeName === 'y2');
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'linear-gradient',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        angle: 0,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const angle = state.props.angle as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = `rotate(${angle})`;
      return {
        type: 'animate',
        attributeName: 'gradientTransform',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'gradientTransform',
      to: `rotate(${angle})`,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const angle = (ctx.state.props.angle as number) ?? 0;
    const rad = (angle * Math.PI) / 180;
    const dist = Math.min(maxX - minX, maxY - minY) / 2;
    const color = colorMode === 'dark' ? '#FBBF24' : '#D97706';
    
    return (
      <g className="linear-gradient-gizmo">
        <line
          x1={cx - Math.cos(rad) * dist}
          y1={cy - Math.sin(rad) * dist}
          x2={cx + Math.cos(rad) * dist}
          y2={cy + Math.sin(rad) * dist}
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
        <defs>
          <linearGradient id={`preview-grad-${ctx.animation.id}`} x1="0%" y1="0%" x2="100%" y2="0%"
            gradientTransform={`rotate(${angle})`}>
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </g>
    );
  },
};

// =============================================================================
// Radial Gradient Gizmo (15)
// =============================================================================

const radialGradientGizmoDefinition: AnimationGizmoDefinition = {
  id: 'radial-gradient',
  category: 'gradient-pattern',
  priority: 48,
  
  metadata: {
    name: 'Radial Gradient',
    description: 'Animate radial gradient center and radius',
    icon: 'circle',
  },
  
  handles: [
    {
      id: 'center',
      type: 'position',
      getPosition: (ctx) => {
        const center = ctx.state.props.center as Point ?? ctx.elementCenter;
        return center;
      },
      onDrag: (delta, ctx) => {
        const current = ctx.state.props.center as Point ?? ctx.elementCenter;
        ctx.updateState({ center: { x: current.x + delta.x, y: current.y + delta.y } });
      },
      onDragEnd: (ctx) => {
        const radius = ctx.state.props.radius as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = String(radius);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'r',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'r',
            to: String(radius),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Gradient Center',
    },
    {
      id: 'radius',
      type: 'scale',
      getPosition: (ctx) => {
        const center = ctx.state.props.center as Point ?? ctx.elementCenter;
        const radius = (ctx.state.props.radius as number) ?? 50;
        return { x: center.x + radius, y: center.y };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.radius as number) ?? 50;
        ctx.updateState({ radius: Math.max(1, current + delta.x) });
      },
      onDragEnd: (ctx) => {
        const radius = ctx.state.props.radius as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = String(radius);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'r',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'r',
            to: String(radius),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Gradient Radius',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && 
      (animation.attributeName === 'cx' || animation.attributeName === 'cy' ||
       animation.attributeName === 'r' || animation.attributeName === 'fr');
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'radial-gradient',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        radius: 50,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const radius = state.props.radius as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = String(radius);
      return {
        type: 'animate',
        attributeName: 'r',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'r',
      to: String(radius),
    };
  },
  
  render: (ctx) => {
    const { viewport, colorMode } = ctx;
    const center = ctx.state.props.center as Point ?? ctx.elementCenter;
    const radius = (ctx.state.props.radius as number) ?? 50;
    const color = colorMode === 'dark' ? '#C084FC' : '#9333EA';
    
    return (
      <g className="radial-gradient-gizmo">
        <circle
          cx={center.x}
          cy={center.y}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
          strokeDasharray={`${4 / viewport.zoom} ${2 / viewport.zoom}`}
        />
        <circle
          cx={center.x}
          cy={center.y}
          r={3 / viewport.zoom}
          fill={color}
        />
      </g>
    );
  },
};

// =============================================================================
// Pattern Transform Gizmo (16)
// =============================================================================

const patternTransformGizmoDefinition: AnimationGizmoDefinition = {
  id: 'pattern-transform',
  category: 'gradient-pattern',
  priority: 45,
  
  metadata: {
    name: 'Pattern Transform',
    description: 'Animate pattern scale and rotation',
    icon: 'grid',
  },
  
  handles: [
    {
      id: 'pattern-scale',
      type: 'scale',
      getPosition: (ctx) => {
        const scale = (ctx.state.props.patternScale as number) ?? 1;
        const { maxX, minY } = ctx.elementBounds;
        return { x: maxX + 20 / ctx.viewport.zoom * scale, y: minY };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.patternScale as number) ?? 1;
        ctx.updateState({ patternScale: Math.max(0.1, current + delta.x / 50) });
      },
      onDragEnd: (ctx) => {
        const patternScale = ctx.state.props.patternScale as number;
        const patternRotation = ctx.state.props.patternRotation as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const toValue = `scale(${patternScale}) rotate(${patternRotation})`;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = toValue;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'patternTransform',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'patternTransform',
            to: toValue,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'nwse-resize',
      tooltip: 'Pattern Scale',
    },
    {
      id: 'pattern-rotation',
      type: 'rotation',
      getPosition: (ctx) => {
        const rotation = (ctx.state.props.patternRotation as number) ?? 0;
        const { maxX, maxY } = ctx.elementBounds;
        const rad = (rotation * Math.PI) / 180;
        return { x: maxX + 30 / ctx.viewport.zoom * Math.cos(rad), y: maxY + 30 / ctx.viewport.zoom * Math.sin(rad) };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.patternRotation as number) ?? 0;
        ctx.updateState({ patternRotation: current + delta.x });
      },
      onDragEnd: (ctx) => {
        const patternScale = ctx.state.props.patternScale as number;
        const patternRotation = ctx.state.props.patternRotation as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const toValue = `scale(${patternScale}) rotate(${patternRotation})`;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = toValue;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'patternTransform',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'patternTransform',
            to: toValue,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'crosshair',
      tooltip: 'Pattern Rotation',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'patternTransform';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'pattern-transform',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        patternScale: 1, 
        patternRotation: 0,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const patternScale = state.props.patternScale as number;
    const patternRotation = state.props.patternRotation as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    const toValue = `scale(${patternScale}) rotate(${patternRotation})`;
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = toValue;
      return {
        type: 'animate',
        attributeName: 'patternTransform',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'patternTransform',
      to: toValue,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const scale = (ctx.state.props.patternScale as number) ?? 1;
    const color = colorMode === 'dark' ? '#2DD4BF' : '#0D9488';
    const gridSize = 20 * scale;
    
    return (
      <g className="pattern-transform-gizmo" opacity={0.5}>
        {Array.from({ length: Math.ceil((maxX - minX) / gridSize) }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={minX + i * gridSize}
            y1={minY}
            x2={minX + i * gridSize}
            y2={maxY}
            stroke={color}
            strokeWidth={0.5 / viewport.zoom}
          />
        ))}
        {Array.from({ length: Math.ceil((maxY - minY) / gridSize) }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={minX}
            y1={minY + i * gridSize}
            x2={maxX}
            y2={minY + i * gridSize}
            stroke={color}
            strokeWidth={0.5 / viewport.zoom}
          />
        ))}
      </g>
    );
  },
};

// =============================================================================
// Gradient Stops Gizmo (17)
// =============================================================================

const gradientStopsGizmoDefinition: AnimationGizmoDefinition = {
  id: 'gradient-stops',
  category: 'gradient-pattern',
  priority: 44,
  
  metadata: {
    name: 'Gradient Stops',
    description: 'Animate color stop positions',
    icon: 'sliders',
  },
  
  handles: [
    {
      id: 'stop-0',
      type: 'value',
      getPosition: (ctx) => {
        const stop = (ctx.state.props.stop0 as number) ?? 0;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * stop, y: maxY + 15 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.stop0 as number) ?? 0;
        ctx.updateState({ stop0: Math.max(0, Math.min(1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        const stop0 = ctx.state.props.stop0 as number;
        const stop1 = ctx.state.props.stop1 as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          // For gradient stops, update first and last keyframe
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[0] = String(stop0);
          updatedKeyframes[updatedKeyframes.length - 1] = String(stop1);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'offset',
            values: formatStyleValuesKeyframes(updatedKeyframes),
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'offset',
            values: `${stop0};${stop1}`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Stop 1 Position',
    },
    {
      id: 'stop-1',
      type: 'value',
      getPosition: (ctx) => {
        const stop = (ctx.state.props.stop1 as number) ?? 1;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * stop, y: maxY + 15 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.stop1 as number) ?? 1;
        ctx.updateState({ stop1: Math.max(0, Math.min(1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        const stop0 = ctx.state.props.stop0 as number;
        const stop1 = ctx.state.props.stop1 as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[0] = String(stop0);
          updatedKeyframes[updatedKeyframes.length - 1] = String(stop1);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'offset',
            values: formatStyleValuesKeyframes(updatedKeyframes),
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'offset',
            values: `${stop0};${stop1}`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Stop 2 Position',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'offset';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { from, to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'gradient-stops',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        stop0: parseFloat(from) || 0, 
        stop1: parseFloat(to) || 1,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const stop0 = state.props.stop0 as number;
    const stop1 = state.props.stop1 as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[0] = String(stop0);
      updatedKeyframes[updatedKeyframes.length - 1] = String(stop1);
      return {
        type: 'animate',
        attributeName: 'offset',
        values: formatStyleValuesKeyframes(updatedKeyframes),
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'offset',
      values: `${stop0};${stop1}`,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const width = maxX - minX;
    const stop0 = (ctx.state.props.stop0 as number) ?? 0;
    const stop1 = (ctx.state.props.stop1 as number) ?? 1;
    const color = colorMode === 'dark' ? '#FB923C' : '#EA580C';
    
    return (
      <g className="gradient-stops-gizmo">
        <rect
          x={minX}
          y={maxY + 10 / viewport.zoom}
          width={width}
          height={8 / viewport.zoom}
          fill={colorMode === 'dark' ? '#374151' : '#E5E7EB'}
          rx={4 / viewport.zoom}
        />
        <circle
          cx={minX + width * stop0}
          cy={maxY + 14 / viewport.zoom}
          r={6 / viewport.zoom}
          fill={color}
          stroke={colorMode === 'dark' ? '#F9FAFB' : '#111827'}
          strokeWidth={1 / viewport.zoom}
        />
        <circle
          cx={minX + width * stop1}
          cy={maxY + 14 / viewport.zoom}
          r={6 / viewport.zoom}
          fill={color}
          stroke={colorMode === 'dark' ? '#F9FAFB' : '#111827'}
          strokeWidth={1 / viewport.zoom}
        />
      </g>
    );
  },
};

// =============================================================================
// Export
// =============================================================================

export const gradientPatternGizmos = [
  linearGradientGizmoDefinition,
  radialGradientGizmoDefinition,
  patternTransformGizmoDefinition,
  gradientStopsGizmoDefinition,
];
