/**
 * Clip & Mask Animation Gizmos
 * 
 * Gizmos for clipping and masking animations:
 * - Clip Path (11): Animate clip-path property
 * - Mask Reveal (12): Animate mask opacity/position
 * - Mask Wipe (13): Directional mask reveal effects
 */

import type {
  AnimationGizmoDefinition,
  GizmoState,
  GizmoHandle,
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
// Clip Path Gizmo (11)
// =============================================================================

const clipPathHandles: GizmoHandle[] = [
  {
    id: 'clip-inset-top',
    type: 'value',
    getPosition: (ctx) => {
      const inset = (ctx.state.props.insetTop as number) ?? 0;
      const { minX, maxX, minY } = ctx.elementBounds;
      return { x: (minX + maxX) / 2, y: minY + inset };
    },
    onDrag: (delta, ctx) => {
      const current = (ctx.state.props.insetTop as number) ?? 0;
      ctx.updateState({ insetTop: Math.max(0, current + delta.y) });
    },
    onDragEnd: (ctx) => {
      const { insetTop, insetRight, insetBottom, insetLeft, hasValues, keyframes } = ctx.state.props;
      const toValue = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
      
      if (hasValues && (keyframes as string[]).length > 0) {
        const updatedKeyframes = [...(keyframes as string[])];
        updatedKeyframes[updatedKeyframes.length - 1] = toValue;
        ctx.updateAnimation({
          type: 'animate',
          attributeName: 'clip-path',
          values: formatStyleValuesKeyframes(updatedKeyframes),
          from: undefined,
          to: undefined,
        });
      } else {
        ctx.updateAnimation({
          type: 'animate',
          attributeName: 'clip-path',
          to: toValue,
        });
      }
      ctx.commitChanges();
    },
    cursor: 'ns-resize',
    tooltip: 'Top Inset',
  },
  {
    id: 'clip-inset-right',
    type: 'value',
    getPosition: (ctx) => {
      const inset = (ctx.state.props.insetRight as number) ?? 0;
      const { maxX, minY, maxY } = ctx.elementBounds;
      return { x: maxX - inset, y: (minY + maxY) / 2 };
    },
    onDrag: (delta, ctx) => {
      const current = (ctx.state.props.insetRight as number) ?? 0;
      ctx.updateState({ insetRight: Math.max(0, current - delta.x) });
    },
    onDragEnd: (ctx) => {
      const { insetTop, insetRight, insetBottom, insetLeft, hasValues, keyframes } = ctx.state.props;
      const toValue = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
      
      if (hasValues && (keyframes as string[]).length > 0) {
        const updatedKeyframes = [...(keyframes as string[])];
        updatedKeyframes[updatedKeyframes.length - 1] = toValue;
        ctx.updateAnimation({
          type: 'animate',
          attributeName: 'clip-path',
          values: formatStyleValuesKeyframes(updatedKeyframes),
          from: undefined,
          to: undefined,
        });
      } else {
        ctx.updateAnimation({
          type: 'animate',
          attributeName: 'clip-path',
          to: toValue,
        });
      }
      ctx.commitChanges();
    },
    cursor: 'ew-resize',
    tooltip: 'Right Inset',
  },
  {
    id: 'clip-inset-bottom',
    type: 'value',
    getPosition: (ctx) => {
      const inset = (ctx.state.props.insetBottom as number) ?? 0;
      const { minX, maxX, maxY } = ctx.elementBounds;
      return { x: (minX + maxX) / 2, y: maxY - inset };
    },
    onDrag: (delta, ctx) => {
      const current = (ctx.state.props.insetBottom as number) ?? 0;
      ctx.updateState({ insetBottom: Math.max(0, current - delta.y) });
    },
    onDragEnd: (ctx) => {
      const { insetTop, insetRight, insetBottom, insetLeft, hasValues, keyframes } = ctx.state.props;
      const toValue = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
      
      if (hasValues && (keyframes as string[]).length > 0) {
        const updatedKeyframes = [...(keyframes as string[])];
        updatedKeyframes[updatedKeyframes.length - 1] = toValue;
        ctx.updateAnimation({
          type: 'animate',
          attributeName: 'clip-path',
          values: formatStyleValuesKeyframes(updatedKeyframes),
          from: undefined,
          to: undefined,
        });
      } else {
        ctx.updateAnimation({
          type: 'animate',
          attributeName: 'clip-path',
          to: toValue,
        });
      }
      ctx.commitChanges();
    },
    cursor: 'ns-resize',
    tooltip: 'Bottom Inset',
  },
  {
    id: 'clip-inset-left',
    type: 'value',
    getPosition: (ctx) => {
      const inset = (ctx.state.props.insetLeft as number) ?? 0;
      const { minX, minY, maxY } = ctx.elementBounds;
      return { x: minX + inset, y: (minY + maxY) / 2 };
    },
    onDrag: (delta, ctx) => {
      const current = (ctx.state.props.insetLeft as number) ?? 0;
      ctx.updateState({ insetLeft: Math.max(0, current + delta.x) });
    },
    onDragEnd: (ctx) => {
      const { insetTop, insetRight, insetBottom, insetLeft, hasValues, keyframes } = ctx.state.props;
      const toValue = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
      
      if (hasValues && (keyframes as string[]).length > 0) {
        const updatedKeyframes = [...(keyframes as string[])];
        updatedKeyframes[updatedKeyframes.length - 1] = toValue;
        ctx.updateAnimation({
          type: 'animate',
          attributeName: 'clip-path',
          values: formatStyleValuesKeyframes(updatedKeyframes),
          from: undefined,
          to: undefined,
        });
      } else {
        ctx.updateAnimation({
          type: 'animate',
          attributeName: 'clip-path',
          to: toValue,
        });
      }
      ctx.commitChanges();
    },
    cursor: 'ew-resize',
    tooltip: 'Left Inset',
  },
];

const clipPathGizmoDefinition: AnimationGizmoDefinition = {
  id: 'clip-path',
  category: 'clip-mask',
  priority: 50,
  
  metadata: {
    name: 'Clip Path',
    description: 'Animate clipping region insets',
    icon: 'scissors',
  },
  
  handles: clipPathHandles,
  
  canHandle: (animation) => {
    return (
      animation.type === 'animate' &&
      animation.attributeName === 'clip-path'
    );
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'clip-path',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: {
        insetTop: 0,
        insetRight: 0,
        insetBottom: 0,
        insetLeft: 0,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const { insetTop, insetRight, insetBottom, insetLeft } = state.props;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    const toValue = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = toValue;
      return {
        type: 'animate',
        attributeName: 'clip-path',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'clip-path',
      to: toValue,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const strokeWidth = 1.5 / viewport.zoom;
    const clipColor = colorMode === 'dark' ? '#F472B6' : '#EC4899';
    
    const insetTop = (ctx.state.props.insetTop as number) ?? 0;
    const insetRight = (ctx.state.props.insetRight as number) ?? 0;
    const insetBottom = (ctx.state.props.insetBottom as number) ?? 0;
    const insetLeft = (ctx.state.props.insetLeft as number) ?? 0;
    
    return (
      <g className="clip-path-gizmo">
        <rect
          x={minX + insetLeft}
          y={minY + insetTop}
          width={maxX - minX - insetLeft - insetRight}
          height={maxY - minY - insetTop - insetBottom}
          fill="none"
          stroke={clipColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${4 / viewport.zoom} ${2 / viewport.zoom}`}
        />
      </g>
    );
  },
};

// =============================================================================
// Mask Reveal Gizmo (12)
// =============================================================================

const maskRevealGizmoDefinition: AnimationGizmoDefinition = {
  id: 'mask-reveal',
  category: 'clip-mask',
  priority: 48,
  
  metadata: {
    name: 'Mask Reveal',
    description: 'Animate mask opacity for reveal effects',
    icon: 'eye',
  },
  
  handles: [
    {
      id: 'mask-opacity',
      type: 'value',
      getPosition: (ctx) => {
        const opacity = (ctx.state.props.maskOpacity as number) ?? 1;
        const { minX, maxX, maxY } = ctx.elementBounds;
        const width = maxX - minX;
        return { x: minX + width * opacity, y: maxY + 20 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.maskOpacity as number) ?? 1;
        ctx.updateState({ maskOpacity: Math.max(0, Math.min(1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        const maskOpacity = ctx.state.props.maskOpacity as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = String(maskOpacity);
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'mask-opacity',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'mask-opacity',
            to: String(maskOpacity),
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Mask Opacity',
    },
  ],
  
  canHandle: (animation) => {
    return (
      animation.type === 'animate' &&
      (animation.attributeName === 'mask' || animation.attributeName === 'mask-opacity')
    );
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'mask-reveal',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        maskOpacity: parseFloat(to) || 1,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const maskOpacity = state.props.maskOpacity as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = String(maskOpacity);
      return {
        type: 'animate',
        attributeName: 'mask-opacity',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'mask-opacity',
      to: String(maskOpacity),
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const width = maxX - minX;
    const opacity = (ctx.state.props.maskOpacity as number) ?? 1;
    const color = colorMode === 'dark' ? '#A78BFA' : '#7C3AED';
    
    return (
      <g className="mask-reveal-gizmo">
        <rect
          x={minX}
          y={maxY + 15 / viewport.zoom}
          width={width}
          height={6 / viewport.zoom}
          fill={colorMode === 'dark' ? '#374151' : '#E5E7EB'}
          rx={3 / viewport.zoom}
        />
        <rect
          x={minX}
          y={maxY + 15 / viewport.zoom}
          width={width * opacity}
          height={6 / viewport.zoom}
          fill={color}
          rx={3 / viewport.zoom}
        />
      </g>
    );
  },
};

// =============================================================================
// Mask Wipe Gizmo (13)
// =============================================================================

const maskWipeGizmoDefinition: AnimationGizmoDefinition = {
  id: 'mask-wipe',
  category: 'clip-mask',
  priority: 46,
  
  metadata: {
    name: 'Mask Wipe',
    description: 'Directional mask wipe transition',
    icon: 'arrow-right',
  },
  
  handles: [
    {
      id: 'wipe-position',
      type: 'position',
      getPosition: (ctx) => {
        const progress = (ctx.state.props.wipeProgress as number) ?? 0;
        const direction = (ctx.state.props.direction as string) ?? 'right';
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const width = maxX - minX;
        const height = maxY - minY;
        
        if (direction === 'right' || direction === 'left') {
          return { x: minX + width * progress, y: (minY + maxY) / 2 };
        }
        return { x: (minX + maxX) / 2, y: minY + height * progress };
      },
      onDrag: (delta, ctx) => {
        const direction = (ctx.state.props.direction as string) ?? 'right';
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const current = (ctx.state.props.wipeProgress as number) ?? 0;
        
        if (direction === 'right' || direction === 'left') {
          const width = maxX - minX;
          ctx.updateState({ wipeProgress: Math.max(0, Math.min(1, current + delta.x / width)) });
        } else {
          const height = maxY - minY;
          ctx.updateState({ wipeProgress: Math.max(0, Math.min(1, current + delta.y / height)) });
        }
      },
      onDragEnd: (ctx) => {
        const wipeProgress = ctx.state.props.wipeProgress as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const toValue = `${wipeProgress * 100}%`;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = toValue;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'mask-position',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'mask-position',
            to: toValue,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Wipe Position',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'mask-position';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'mask-wipe',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        wipeProgress: 0, 
        direction: 'right',
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const wipeProgress = state.props.wipeProgress as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    const toValue = `${wipeProgress * 100}%`;
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = toValue;
      return {
        type: 'animate',
        attributeName: 'mask-position',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'mask-position',
      to: toValue,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const progress = (ctx.state.props.wipeProgress as number) ?? 0;
    const color = colorMode === 'dark' ? '#34D399' : '#059669';
    const width = maxX - minX;
    
    return (
      <g className="mask-wipe-gizmo">
        <line
          x1={minX + width * progress}
          y1={minY}
          x2={minX + width * progress}
          y2={maxY}
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
        <polygon
          points={`${minX + width * progress - 5 / viewport.zoom},${minY - 8 / viewport.zoom} ${minX + width * progress + 5 / viewport.zoom},${minY - 8 / viewport.zoom} ${minX + width * progress},${minY}`}
          fill={color}
        />
      </g>
    );
  },
};

// =============================================================================
// Export
// =============================================================================

export const clipMaskGizmos = [
  clipPathGizmoDefinition,
  maskRevealGizmoDefinition,
  maskWipeGizmoDefinition,
];
