/**
 * Hierarchy Animation Gizmos
 * 
 * Gizmos for hierarchical/structural animations:
 * - Transform Origin (21): Animate transform origin point
 * - Z-Order (22): Animate stacking order
 * - Parent Inherit (23): Inherit transforms from parent
 * - Cascade Delay (24): Sequential child animations
 * - Group Transform (25): Apply transform to group
 * - Anchor Point (26): Animate anchor/pivot point
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
// Transform Origin Gizmo (21)
// =============================================================================

const transformOriginGizmoDefinition: AnimationGizmoDefinition = {
  id: 'transform-origin',
  category: 'hierarchy',
  priority: 50,
  
  metadata: {
    name: 'Transform Origin',
    description: 'Animate the transform origin point',
    icon: 'crosshair',
  },
  
  handles: [
    {
      id: 'origin',
      type: 'position',
      getPosition: (ctx) => {
        const origin = ctx.state.props.origin as Point ?? ctx.elementCenter;
        return origin;
      },
      onDrag: (delta, ctx) => {
        const current = ctx.state.props.origin as Point ?? ctx.elementCenter;
        ctx.updateState({ origin: { x: current.x + delta.x, y: current.y + delta.y } });
      },
      onDragEnd: (ctx) => {
        const origin = ctx.state.props.origin as Point;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const toValue = origin ? `${origin.x}px ${origin.y}px` : 'center';
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = toValue;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'transform-origin',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'transform-origin',
            to: toValue,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Transform Origin',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'transform-origin';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'transform-origin',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: {
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const origin = state.props.origin as Point;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    const toValue = origin ? `${origin.x}px ${origin.y}px` : 'center';
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = toValue;
      return {
        type: 'animate',
        attributeName: 'transform-origin',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'transform-origin',
      to: toValue,
    };
  },
  
  render: (ctx) => {
    const { viewport, colorMode } = ctx;
    const origin = ctx.state.props.origin as Point ?? ctx.elementCenter;
    const color = colorMode === 'dark' ? '#F472B6' : '#EC4899';
    const size = 12 / viewport.zoom;
    
    return (
      <g className="transform-origin-gizmo">
        <line
          x1={origin.x - size}
          y1={origin.y}
          x2={origin.x + size}
          y2={origin.y}
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
        <line
          x1={origin.x}
          y1={origin.y - size}
          x2={origin.x}
          y2={origin.y + size}
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
        <circle
          cx={origin.x}
          cy={origin.y}
          r={size / 2}
          fill="none"
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
      </g>
    );
  },
};

// =============================================================================
// Z-Order Gizmo (22)
// =============================================================================

const zOrderGizmoDefinition: AnimationGizmoDefinition = {
  id: 'z-order',
  category: 'hierarchy',
  priority: 48,
  
  metadata: {
    name: 'Z-Order',
    description: 'Animate stacking order',
    icon: 'layers',
  },
  
  handles: [
    {
      id: 'z-index',
      type: 'value',
      getPosition: (ctx) => {
        const zIndex = (ctx.state.props.zIndex as number) ?? 0;
        const { maxX, minY } = ctx.elementBounds;
        return { x: maxX + 15 / ctx.viewport.zoom, y: minY - zIndex * 3 };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.zIndex as number) ?? 0;
        ctx.updateState({ zIndex: Math.round(current - delta.y / 3) });
      },
      onDragEnd: (ctx) => {
        const zIndex = ctx.state.props.zIndex as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = String(zIndex);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'z-index',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'z-index',
            to: String(zIndex),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Z-Index',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'z-index';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'z-order',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        zIndex: parseInt(to || '0'),
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const zIndex = state.props.zIndex as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = String(zIndex);
      return {
        type: 'animate',
        attributeName: 'z-index',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'z-index',
      to: String(zIndex),
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { maxX, minY } = elementBounds;
    const zIndex = (ctx.state.props.zIndex as number) ?? 0;
    const color = colorMode === 'dark' ? '#A78BFA' : '#7C3AED';
    
    return (
      <g className="z-order-gizmo">
        {[0, 1, 2].map(level => (
          <rect
            key={`z-layer-${level}`}
            x={maxX + 10 / viewport.zoom - level * 3 / viewport.zoom}
            y={minY - 20 / viewport.zoom + level * 3 / viewport.zoom}
            width={15 / viewport.zoom}
            height={15 / viewport.zoom}
            fill={level === 0 ? color : 'none'}
            stroke={color}
            strokeWidth={1 / viewport.zoom}
            opacity={level === 0 ? 1 : 0.4}
          />
        ))}
        <text
          x={maxX + 30 / viewport.zoom}
          y={minY - 10 / viewport.zoom}
          fontSize={10 / viewport.zoom}
          fill={color}
        >
          z: {zIndex}
        </text>
      </g>
    );
  },
};

// =============================================================================
// Parent Inherit Gizmo (23)
// =============================================================================

const parentInheritGizmoDefinition: AnimationGizmoDefinition = {
  id: 'parent-inherit',
  category: 'hierarchy',
  priority: 46,
  
  metadata: {
    name: 'Parent Inherit',
    description: 'Inherit and animate parent transforms',
    icon: 'git-merge',
  },
  
  handles: [
    {
      id: 'inherit-scale',
      type: 'value',
      getPosition: (ctx) => {
        const inherit = (ctx.state.props.inheritScale as number) ?? 1;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 20 / ctx.viewport.zoom, y: minY + (maxY - minY) * (1 - inherit) };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.inheritScale as number) ?? 1;
        ctx.updateState({ inheritScale: Math.max(0, Math.min(1, current - delta.y / height)) });
      },
      onDragEnd: (ctx) => {
        const inheritScale = ctx.state.props.inheritScale as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = String(inheritScale);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'inherit-transform',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'inherit-transform',
            to: String(inheritScale),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Inherit Scale',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'inherit-transform';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'parent-inherit',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        inheritScale: 1,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const inheritScale = state.props.inheritScale as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = String(inheritScale);
      return {
        type: 'animate',
        attributeName: 'inherit-transform',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'inherit-transform',
      to: String(inheritScale),
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY } = elementBounds;
    const inheritScale = (ctx.state.props.inheritScale as number) ?? 1;
    const color = colorMode === 'dark' ? '#34D399' : '#059669';
    
    return (
      <g className="parent-inherit-gizmo">
        <path
          d={`M ${minX} ${minY - 30 / viewport.zoom} L ${(minX + maxX) / 2} ${minY - 15 / viewport.zoom} L ${maxX} ${minY - 30 / viewport.zoom}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
          opacity={inheritScale}
        />
        <circle
          cx={(minX + maxX) / 2}
          cy={minY - 15 / viewport.zoom}
          r={4 / viewport.zoom}
          fill={color}
          opacity={inheritScale}
        />
      </g>
    );
  },
};

// =============================================================================
// Cascade Delay Gizmo (24)
// =============================================================================

const cascadeDelayGizmoDefinition: AnimationGizmoDefinition = {
  id: 'cascade-delay',
  category: 'hierarchy',
  priority: 44,
  
  metadata: {
    name: 'Cascade Delay',
    description: 'Sequential child animation delays',
    icon: 'list',
  },
  
  handles: [
    {
      id: 'delay-offset',
      type: 'timing',
      getPosition: (ctx) => {
        const delay = (ctx.state.props.delayOffset as number) ?? 0.1;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * delay * 5, y: maxY + 20 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.delayOffset as number) ?? 0.1;
        ctx.updateState({ delayOffset: Math.max(0, Math.min(0.5, current + delta.x / width / 5)) });
      },
      onDragEnd: (ctx) => {
        const delayOffset = ctx.state.props.delayOffset as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = `${delayOffset}s`;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'cascade-delay',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'cascade-delay',
            to: `${delayOffset}s`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Delay Offset',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'cascade-delay';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'cascade-delay',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        delayOffset: 0.1,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const delayOffset = state.props.delayOffset as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = `${delayOffset}s`;
      return {
        type: 'animate',
        attributeName: 'cascade-delay',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'cascade-delay',
      to: `${delayOffset}s`,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const delay = (ctx.state.props.delayOffset as number) ?? 0.1;
    const color = colorMode === 'dark' ? '#FBBF24' : '#D97706';
    const width = maxX - minX;
    
    return (
      <g className="cascade-delay-gizmo">
        {[0, 1, 2, 3].map(step => (
          <rect
            key={`cascade-${step}`}
            x={minX + (width / 4) * step}
            y={maxY + 15 / viewport.zoom}
            width={width / 4 - 2 / viewport.zoom}
            height={6 / viewport.zoom}
            fill={color}
            opacity={1 - step * 0.2}
            rx={2 / viewport.zoom}
            style={{ transform: `translateX(${step * delay * 20}px)` }}
          />
        ))}
      </g>
    );
  },
};

// =============================================================================
// Group Transform Gizmo (25)
// =============================================================================

const groupTransformGizmoDefinition: AnimationGizmoDefinition = {
  id: 'group-transform',
  category: 'hierarchy',
  priority: 42,
  
  metadata: {
    name: 'Group Transform',
    description: 'Apply animated transform to entire group',
    icon: 'box',
  },
  
  handles: [
    {
      id: 'group-rotate',
      type: 'rotation',
      getPosition: (ctx) => {
        const rotation = (ctx.state.props.groupRotation as number) ?? 0;
        const rad = (rotation * Math.PI) / 180;
        const { maxX, minY } = ctx.elementBounds;
        return { 
          x: maxX + 25 / ctx.viewport.zoom * Math.cos(rad), 
          y: minY + 25 / ctx.viewport.zoom * Math.sin(rad) 
        };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.groupRotation as number) ?? 0;
        ctx.updateState({ groupRotation: (current + delta.x) % 360 });
      },
      onDragEnd: (ctx) => {
        const groupRotation = ctx.state.props.groupRotation as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = `${groupRotation}`;
          ctx.updateAnimation({
            type: 'animateTransform',
            attributeName: 'transform',
            attrType: 'rotate',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animateTransform',
            attributeName: 'transform',
            attrType: 'rotate',
            to: `${groupRotation}`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'crosshair',
      tooltip: 'Group Rotation',
    },
    {
      id: 'group-scale',
      type: 'scale',
      getPosition: (ctx) => {
        const scale = (ctx.state.props.groupScale as number) ?? 1;
        const { maxX, maxY } = ctx.elementBounds;
        return { x: maxX + 10 / ctx.viewport.zoom * scale, y: maxY + 10 / ctx.viewport.zoom * scale };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.groupScale as number) ?? 1;
        ctx.updateState({ groupScale: Math.max(0.1, current + (delta.x + delta.y) / 100) });
      },
      onDragEnd: (ctx) => {
        const groupRotation = ctx.state.props.groupRotation as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = `${groupRotation}`;
          ctx.updateAnimation({
            type: 'animateTransform',
            attributeName: 'transform',
            attrType: 'rotate',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animateTransform',
            attributeName: 'transform',
            attrType: 'rotate',
            to: `${groupRotation}`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'nwse-resize',
      tooltip: 'Group Scale',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animateTransform' && animation.targetElementId?.startsWith('group-');
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'group-transform',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        groupRotation: 0, 
        groupScale: 1,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const groupRotation = state.props.groupRotation as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = `${groupRotation}`;
      return {
        type: 'animateTransform',
        attributeName: 'transform',
        attrType: 'rotate',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animateTransform',
      attributeName: 'transform',
      attrType: 'rotate',
      to: `${groupRotation}`,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const color = colorMode === 'dark' ? '#60A5FA' : '#2563EB';
    const pad = 5 / viewport.zoom;
    
    return (
      <g className="group-transform-gizmo">
        <rect
          x={minX - pad}
          y={minY - pad}
          width={maxX - minX + pad * 2}
          height={maxY - minY + pad * 2}
          fill="none"
          stroke={color}
          strokeWidth={2 / viewport.zoom}
          strokeDasharray={`${6 / viewport.zoom} ${3 / viewport.zoom}`}
          rx={4 / viewport.zoom}
        />
        <text
          x={minX}
          y={minY - 8 / viewport.zoom}
          fontSize={9 / viewport.zoom}
          fill={color}
        >
          Group
        </text>
      </g>
    );
  },
};

// =============================================================================
// Anchor Point Gizmo (26)
// =============================================================================

const anchorPointGizmoDefinition: AnimationGizmoDefinition = {
  id: 'anchor-point',
  category: 'hierarchy',
  priority: 40,
  
  metadata: {
    name: 'Anchor Point',
    description: 'Animate element anchor/pivot point',
    icon: 'anchor',
  },
  
  handles: [
    {
      id: 'anchor',
      type: 'position',
      getPosition: (ctx) => {
        const anchor = ctx.state.props.anchor as Point ?? ctx.elementCenter;
        return anchor;
      },
      onDrag: (delta, ctx) => {
        const current = ctx.state.props.anchor as Point ?? ctx.elementCenter;
        ctx.updateState({ anchor: { x: current.x + delta.x, y: current.y + delta.y } });
      },
      onDragEnd: (ctx) => {
        const anchor = ctx.state.props.anchor as Point;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const value = anchor ? `${anchor.x} ${anchor.y}` : 'center';
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = value;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'anchor-point',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'anchor-point',
            to: value,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Anchor Point',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'anchor-point';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'anchor-point',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: {
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const anchor = state.props.anchor as Point;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    const value = anchor ? `${anchor.x} ${anchor.y}` : 'center';
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = value;
      return {
        type: 'animate',
        attributeName: 'anchor-point',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'anchor-point',
      to: value,
    };
  },
  
  render: (ctx) => {
    const { viewport, colorMode } = ctx;
    const anchor = ctx.state.props.anchor as Point ?? ctx.elementCenter;
    const color = colorMode === 'dark' ? '#F87171' : '#DC2626';
    
    return (
      <g className="anchor-point-gizmo">
        <circle
          cx={anchor.x}
          cy={anchor.y}
          r={8 / viewport.zoom}
          fill="none"
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
        <circle
          cx={anchor.x}
          cy={anchor.y}
          r={3 / viewport.zoom}
          fill={color}
        />
        <path
          d={`M ${anchor.x} ${anchor.y + 8 / viewport.zoom} 
              L ${anchor.x} ${anchor.y + 18 / viewport.zoom}
              M ${anchor.x - 4 / viewport.zoom} ${anchor.y + 14 / viewport.zoom}
              L ${anchor.x + 4 / viewport.zoom} ${anchor.y + 14 / viewport.zoom}`}
          stroke={color}
          strokeWidth={2 / viewport.zoom}
          strokeLinecap="round"
        />
      </g>
    );
  },
};

// =============================================================================
// Export
// =============================================================================

export const hierarchyGizmos = [
  transformOriginGizmoDefinition,
  zOrderGizmoDefinition,
  parentInheritGizmoDefinition,
  cascadeDelayGizmoDefinition,
  groupTransformGizmoDefinition,
  anchorPointGizmoDefinition,
];
