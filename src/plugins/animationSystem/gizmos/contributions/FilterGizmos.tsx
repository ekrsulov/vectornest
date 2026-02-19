/**
 * Filter Animation Gizmos
 * 
 * Gizmos for SVG filter animations:
 * - Blur (18): Animate gaussian blur radius
 * - Drop Shadow (19): Animate shadow offset and blur
 * - Color Matrix (20): Animate hue/saturation/brightness
 */

import type {
  AnimationGizmoDefinition,
  GizmoState,
} from '../types';
import { createDefaultInteraction } from '../types';
import type { SVGAnimation } from '../../types';

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
// Blur Gizmo (18)
// =============================================================================

const blurGizmoDefinition: AnimationGizmoDefinition = {
  id: 'blur',
  category: 'filter',
  priority: 50,
  
  metadata: {
    name: 'Gaussian Blur',
    description: 'Animate blur radius',
    icon: 'droplet',
  },
  
  handles: [
    {
      id: 'blur-radius',
      type: 'value',
      getPosition: (ctx) => {
        const blur = (ctx.state.props.blurRadius as number) ?? 0;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 20 / ctx.viewport.zoom + blur * 2, y: (minY + maxY) / 2 };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.blurRadius as number) ?? 0;
        ctx.updateState({ blurRadius: Math.max(0, current + delta.x / 2) });
      },
      onDragEnd: (ctx) => {
        const blurRadius = ctx.state.props.blurRadius as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = String(blurRadius);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'stdDeviation',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'stdDeviation',
            to: String(blurRadius),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Blur Radius',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'stdDeviation';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'blur',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        blurRadius: parseFloat(to || '5'),
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const blurRadius = state.props.blurRadius as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = String(blurRadius);
      return {
        type: 'animate',
        attributeName: 'stdDeviation',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'stdDeviation',
      to: String(blurRadius),
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const blur = (ctx.state.props.blurRadius as number) ?? 0;
    const color = colorMode === 'dark' ? '#60A5FA' : '#2563EB';
    
    return (
      <g className="blur-gizmo">
        <rect
          x={minX - blur}
          y={minY - blur}
          width={maxX - minX + blur * 2}
          height={maxY - minY + blur * 2}
          fill="none"
          stroke={color}
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${3 / viewport.zoom} ${2 / viewport.zoom}`}
          opacity={0.6}
        />
        <text
          x={maxX + 25 / viewport.zoom + blur * 2}
          y={(minY + maxY) / 2 + 4 / viewport.zoom}
          fontSize={10 / viewport.zoom}
          fill={color}
        >
          {blur.toFixed(1)}px
        </text>
      </g>
    );
  },
};

// =============================================================================
// Drop Shadow Gizmo (19)
// =============================================================================

const dropShadowGizmoDefinition: AnimationGizmoDefinition = {
  id: 'drop-shadow',
  category: 'filter',
  priority: 48,
  
  metadata: {
    name: 'Drop Shadow',
    description: 'Animate shadow offset and blur',
    icon: 'square',
  },
  
  handles: [
    {
      id: 'shadow-offset',
      type: 'position',
      getPosition: (ctx) => {
        const offsetX = (ctx.state.props.shadowX as number) ?? 5;
        const offsetY = (ctx.state.props.shadowY as number) ?? 5;
        return { x: ctx.elementCenter.x + offsetX, y: ctx.elementCenter.y + offsetY };
      },
      onDrag: (delta, ctx) => {
        const currentX = (ctx.state.props.shadowX as number) ?? 5;
        const currentY = (ctx.state.props.shadowY as number) ?? 5;
        ctx.updateState({ shadowX: currentX + delta.x, shadowY: currentY + delta.y });
      },
      onDragEnd: (ctx) => {
        const shadowX = ctx.state.props.shadowX as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = String(shadowX);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'dx',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'dx',
            to: String(shadowX),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Shadow Offset',
    },
    {
      id: 'shadow-blur',
      type: 'value',
      getPosition: (ctx) => {
        const offsetX = (ctx.state.props.shadowX as number) ?? 5;
        const offsetY = (ctx.state.props.shadowY as number) ?? 5;
        const blur = (ctx.state.props.shadowBlur as number) ?? 4;
        return { x: ctx.elementCenter.x + offsetX + blur, y: ctx.elementCenter.y + offsetY - blur };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.shadowBlur as number) ?? 4;
        ctx.updateState({ shadowBlur: Math.max(0, current + (delta.x - delta.y) / 2) });
      },
      onDragEnd: (ctx) => {
        const shadowX = ctx.state.props.shadowX as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = String(shadowX);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'dx',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'dx',
            to: String(shadowX),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'nesw-resize',
      tooltip: 'Shadow Blur',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && 
      (animation.attributeName === 'dx' || animation.attributeName === 'dy' ||
       animation.attributeName === 'flood-opacity');
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'drop-shadow',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        shadowX: 5, 
        shadowY: 5, 
        shadowBlur: 4,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const shadowX = state.props.shadowX as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = String(shadowX);
      return {
        type: 'animate',
        attributeName: 'dx',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'dx',
      to: String(shadowX),
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const offsetX = (ctx.state.props.shadowX as number) ?? 5;
    const offsetY = (ctx.state.props.shadowY as number) ?? 5;
    const blur = (ctx.state.props.shadowBlur as number) ?? 4;
    const color = colorMode === 'dark' ? '#9CA3AF' : '#6B7280';
    
    return (
      <g className="drop-shadow-gizmo">
        <rect
          x={minX + offsetX}
          y={minY + offsetY}
          width={maxX - minX}
          height={maxY - minY}
          fill={color}
          opacity={0.3}
          filter={`blur(${blur}px)`}
          rx={2 / viewport.zoom}
        />
        <line
          x1={ctx.elementCenter.x}
          y1={ctx.elementCenter.y}
          x2={ctx.elementCenter.x + offsetX}
          y2={ctx.elementCenter.y + offsetY}
          stroke={color}
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
        />
      </g>
    );
  },
};

// =============================================================================
// Color Matrix Gizmo (20)
// =============================================================================

const colorMatrixGizmoDefinition: AnimationGizmoDefinition = {
  id: 'color-matrix',
  category: 'filter',
  priority: 45,
  
  metadata: {
    name: 'Color Matrix',
    description: 'Animate hue rotation, saturation, brightness',
    icon: 'palette',
  },
  
  handles: [
    {
      id: 'hue-rotation',
      type: 'rotation',
      getPosition: (ctx) => {
        const hue = (ctx.state.props.hueRotate as number) ?? 0;
        const rad = (hue * Math.PI) / 180;
        const { maxX, minY } = ctx.elementBounds;
        return { x: maxX + 30 / ctx.viewport.zoom + Math.cos(rad) * 20 / ctx.viewport.zoom, 
                 y: minY + Math.sin(rad) * 20 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.hueRotate as number) ?? 0;
        ctx.updateState({ hueRotate: (current + delta.x) % 360 });
      },
      onDragEnd: (ctx) => {
        const hueRotate = ctx.state.props.hueRotate as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = `${hueRotate}`;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'values',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'values',
            to: `${hueRotate}`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'crosshair',
      tooltip: 'Hue Rotation',
    },
    {
      id: 'saturation',
      type: 'value',
      getPosition: (ctx) => {
        const sat = (ctx.state.props.saturate as number) ?? 1;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 20 / ctx.viewport.zoom, y: minY + (maxY - minY) * (1 - sat / 2) };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.saturate as number) ?? 1;
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        ctx.updateState({ saturate: Math.max(0, Math.min(2, current - delta.y / (height / 2))) });
      },
      onDragEnd: (ctx) => {
        const hueRotate = ctx.state.props.hueRotate as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = `${hueRotate}`;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'values',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'values',
            to: `${hueRotate}`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Saturation',
    },
    {
      id: 'brightness',
      type: 'value',
      getPosition: (ctx) => {
        const bright = (ctx.state.props.brightness as number) ?? 1;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 40 / ctx.viewport.zoom, y: minY + (maxY - minY) * (1 - bright / 2) };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.brightness as number) ?? 1;
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        ctx.updateState({ brightness: Math.max(0, Math.min(2, current - delta.y / (height / 2))) });
      },
      onDragEnd: (ctx) => {
        const hueRotate = ctx.state.props.hueRotate as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = `${hueRotate}`;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'values',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'values',
            to: `${hueRotate}`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Brightness',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'values' &&
      animation.targetElementId?.includes('feColorMatrix');
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'color-matrix',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        hueRotate: 0, 
        saturate: 1, 
        brightness: 1,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const hueRotate = state.props.hueRotate as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = `${hueRotate}`;
      return {
        type: 'animate',
        attributeName: 'values',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'values',
      to: `${hueRotate}`,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { maxX, minY, maxY } = elementBounds;
    const height = maxY - minY;
    const hue = (ctx.state.props.hueRotate as number) ?? 0;
    const sat = (ctx.state.props.saturate as number) ?? 1;
    const bright = (ctx.state.props.brightness as number) ?? 1;
    
    const hueColor = `hsl(${hue}, 70%, 50%)`;
    const trackBg = colorMode === 'dark' ? '#374151' : '#E5E7EB';
    
    return (
      <g className="color-matrix-gizmo">
        {/* Hue wheel indicator */}
        <circle
          cx={maxX + 30 / viewport.zoom}
          cy={minY}
          r={20 / viewport.zoom}
          fill="none"
          stroke={hueColor}
          strokeWidth={3 / viewport.zoom}
        />
        
        {/* Saturation track */}
        <rect
          x={maxX + 17 / viewport.zoom}
          y={minY}
          width={6 / viewport.zoom}
          height={height}
          fill={trackBg}
          rx={3 / viewport.zoom}
        />
        <rect
          x={maxX + 17 / viewport.zoom}
          y={minY + height * (1 - sat / 2)}
          width={6 / viewport.zoom}
          height={height * sat / 2}
          fill={colorMode === 'dark' ? '#F472B6' : '#EC4899'}
          rx={3 / viewport.zoom}
        />
        
        {/* Brightness track */}
        <rect
          x={maxX + 37 / viewport.zoom}
          y={minY}
          width={6 / viewport.zoom}
          height={height}
          fill={trackBg}
          rx={3 / viewport.zoom}
        />
        <rect
          x={maxX + 37 / viewport.zoom}
          y={minY + height * (1 - bright / 2)}
          width={6 / viewport.zoom}
          height={height * bright / 2}
          fill={colorMode === 'dark' ? '#FBBF24' : '#F59E0B'}
          rx={3 / viewport.zoom}
        />
      </g>
    );
  },
};

// =============================================================================
// Export
// =============================================================================

export const filterGizmos = [
  blurGizmoDefinition,
  dropShadowGizmoDefinition,
  colorMatrixGizmoDefinition,
];
