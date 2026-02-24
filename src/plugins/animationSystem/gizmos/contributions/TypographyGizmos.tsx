/**
 * Typography Animation Gizmos
 * 
 * Gizmos for text and typography animations:
 * - Text Path (31): Animate text along a path
 * - Letter Spacing (32): Animate character spacing
 * - Text Reveal (33): Character-by-character reveal
 * - Font Variation (34): Animate variable font axes
 */

import type {
  AnimationGizmoDefinition,
  GizmoState,
} from '../types';
import { createDefaultInteraction } from '../types';
import type { SVGAnimation } from '../../types';
import { formatStyleValuesKeyframes, extractStyleAnimationValues } from './gizmoHelpers';

// =============================================================================
// Text Path Gizmo (31)
// =============================================================================

const textPathGizmoDefinition: AnimationGizmoDefinition = {
  id: 'text-path',
  category: 'typography',
  priority: 50,
  
  metadata: {
    name: 'Text Path',
    description: 'Animate text along an SVG path',
    icon: 'type',
  },
  
  handles: [
    {
      id: 'text-offset',
      type: 'value',
      getPosition: (ctx) => {
        const offset = (ctx.state.props.startOffset as number) ?? 0;
        const { minX, maxX, minY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * offset, y: minY - 15 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.startOffset as number) ?? 0;
        ctx.updateState({ startOffset: Math.max(0, Math.min(1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        const startOffset = ctx.state.props.startOffset as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const value = `${startOffset * 100}%`;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = value;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'startOffset',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'startOffset',
            to: value,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Start Offset',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'startOffset';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'text-path',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        startOffset: 0,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const startOffset = state.props.startOffset as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    const value = `${startOffset * 100}%`;
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = value;
      return {
        type: 'animate',
        attributeName: 'startOffset',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'startOffset',
      to: value,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY } = elementBounds;
    const width = maxX - minX;
    const offset = (ctx.state.props.startOffset as number) ?? 0;
    const color = colorMode === 'dark' ? '#F472B6' : '#EC4899';
    
    return (
      <g className="text-path-gizmo" style={{ pointerEvents: 'none' }}>
        <path
          d={`M ${minX} ${minY - 10 / viewport.zoom} Q ${minX + width / 2} ${minY - 30 / viewport.zoom} ${maxX} ${minY - 10 / viewport.zoom}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
          strokeDasharray={`${4 / viewport.zoom} ${2 / viewport.zoom}`}
        />
        <circle
          cx={minX + width * offset}
          cy={minY - 10 / viewport.zoom - Math.sin(offset * Math.PI) * 20 / viewport.zoom}
          r={5 / viewport.zoom}
          fill={color}
        />
        <text
          x={minX + width * offset + 8 / viewport.zoom}
          y={minY - 15 / viewport.zoom}
          fontSize={9 / viewport.zoom}
          fill={color}
        >
          {Math.round(offset * 100)}%
        </text>
      </g>
    );
  },
};

// =============================================================================
// Letter Spacing Gizmo (32)
// =============================================================================

const letterSpacingGizmoDefinition: AnimationGizmoDefinition = {
  id: 'letter-spacing',
  category: 'typography',
  priority: 48,
  
  metadata: {
    name: 'Letter Spacing',
    description: 'Animate space between characters',
    icon: 'space',
  },
  
  handles: [
    {
      id: 'spacing',
      type: 'value',
      getPosition: (ctx) => {
        const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
        const fromSpacing = (ctx.state.props.fromSpacing as number) ?? 0;
        const toSpacing = (ctx.state.props.toSpacing as number) ?? 0;
        
        let spacing: number;
        if (hasValues && keyframes.length > 0) {
          spacing = parseFloat(keyframes[activeKeyframeIndex] || '0');
        } else {
          spacing = activeKeyframeIndex === 0 ? fromSpacing : toSpacing;
        }
        
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 15 / ctx.viewport.zoom + spacing * 5, y: (minY + maxY) / 2 };
      },
      onDrag: (delta, ctx) => {
        const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
        const fromSpacing = (ctx.state.props.fromSpacing as number) ?? 0;
        const toSpacing = (ctx.state.props.toSpacing as number) ?? 0;
        
        let current: number;
        if (hasValues && keyframes.length > 0) {
          current = parseFloat(keyframes[activeKeyframeIndex] || '0');
        } else {
          current = activeKeyframeIndex === 0 ? fromSpacing : toSpacing;
        }
        
        const newSpacing = Math.max(-5, current + delta.x / 5);
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[activeKeyframeIndex] = `${newSpacing}px`;
          const updates: Record<string, unknown> = { keyframes: updatedKeyframes };
          if (activeKeyframeIndex === 0) updates.fromSpacing = newSpacing;
          if (activeKeyframeIndex === keyframes.length - 1) updates.toSpacing = newSpacing;
          ctx.updateState(updates);
        } else {
          if (activeKeyframeIndex === 0) {
            ctx.updateState({ fromSpacing: newSpacing });
          } else {
            ctx.updateState({ toSpacing: newSpacing });
          }
        }
      },
      onDragEnd: (ctx) => {
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const fromSpacing = ctx.state.props.fromSpacing as number;
        const toSpacing = ctx.state.props.toSpacing as number;
        
        if (hasValues && keyframes.length > 0) {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'letter-spacing',
            values: formatStyleValuesKeyframes(keyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'letter-spacing',
            from: `${fromSpacing}px`,
            to: `${toSpacing}px`,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Letter Spacing',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'letter-spacing';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { from, to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    const fromSpacing = parseFloat(from || '0');
    const toSpacing = parseFloat(to || '0');
    
    return {
      gizmoId: 'letter-spacing',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        fromSpacing,
        toSpacing,
        hasValues,
        keyframes,
        activeKeyframeIndex: 0,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const fromSpacing = state.props.fromSpacing as number;
    const toSpacing = state.props.toSpacing as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[0] = `${fromSpacing}px`;
      updatedKeyframes[updatedKeyframes.length - 1] = `${toSpacing}px`;
      return {
        type: 'animate',
        attributeName: 'letter-spacing',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'letter-spacing',
      from: `${fromSpacing}px`,
      to: `${toSpacing}px`,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY: _minY, maxY } = elementBounds;
    const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
    const hasValues = ctx.state.props.hasValues as boolean;
    const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
    const fromSpacing = (ctx.state.props.fromSpacing as number) ?? 0;
    const toSpacing = (ctx.state.props.toSpacing as number) ?? 0;
    
    let spacing: number;
    if (hasValues && keyframes.length > 0) {
      spacing = parseFloat(keyframes[activeKeyframeIndex] || '0');
    } else {
      spacing = activeKeyframeIndex === 0 ? fromSpacing : toSpacing;
    }
    const numKeyframes = hasValues ? keyframes.length : 2;
    
    const color = colorMode === 'dark' ? '#FBBF24' : '#D97706';
    
    // Visualize letters spreading
    const letters = ['A', 'B', 'C'];
    const baseSpacing = (maxX - minX) / 4;
    
    return (
      <g className="letter-spacing-gizmo" style={{ pointerEvents: 'none' }}>
        {letters.map((letter, i) => (
          <text
            key={letter}
            x={minX + baseSpacing * (i + 0.5) + spacing * i * 3}
            y={maxY + 25 / viewport.zoom}
            fontSize={12 / viewport.zoom}
            fill={color}
            textAnchor="middle"
            opacity={0.8}
          >
            {letter}
          </text>
        ))}
        <line
          x1={minX + baseSpacing * 0.5}
          y1={maxY + 35 / viewport.zoom}
          x2={minX + baseSpacing * 2.5 + spacing * 6}
          y2={maxY + 35 / viewport.zoom}
          stroke={color}
          strokeWidth={1 / viewport.zoom}
          markerEnd="url(#arrow)"
          markerStart="url(#arrow)"
        />
        <text
          x={minX + baseSpacing * 1.5}
          y={maxY + 48 / viewport.zoom}
          fontSize={9 / viewport.zoom}
          fill={color}
          textAnchor="middle"
        >
          {spacing.toFixed(1)}px (frame {activeKeyframeIndex + 1}/{numKeyframes})
        </text>
      </g>
    );
  },
};

// =============================================================================
// Text Reveal Gizmo (33)
// =============================================================================

const textRevealGizmoDefinition: AnimationGizmoDefinition = {
  id: 'text-reveal',
  category: 'typography',
  priority: 46,
  
  metadata: {
    name: 'Text Reveal',
    description: 'Character-by-character text reveal',
    icon: 'text-cursor',
  },
  
  handles: [
    {
      id: 'reveal-progress',
      type: 'timing',
      getPosition: (ctx) => {
        const progress = (ctx.state.props.revealProgress as number) ?? 0;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * progress, y: maxY + 20 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.revealProgress as number) ?? 0;
        ctx.updateState({ revealProgress: Math.max(0, Math.min(1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        const revealProgress = ctx.state.props.revealProgress as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const value = `${revealProgress}`;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = value;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'text-reveal',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'text-reveal',
            to: value,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Reveal Progress',
    },
    {
      id: 'char-delay',
      type: 'timing',
      getPosition: (ctx) => {
        const delay = (ctx.state.props.charDelay as number) ?? 0.05;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * delay * 10, y: maxY + 35 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.charDelay as number) ?? 0.05;
        ctx.updateState({ charDelay: Math.max(0.01, Math.min(0.2, current + delta.x / width / 10)) });
      },
      onDragEnd: (ctx) => {
        const revealProgress = ctx.state.props.revealProgress as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const value = `${revealProgress}`;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = value;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'text-reveal',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: 'text-reveal',
            to: value,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Character Delay',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && animation.attributeName === 'text-reveal';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'text-reveal',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        revealProgress: 0, 
        charDelay: 0.05,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const revealProgress = state.props.revealProgress as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    const value = `${revealProgress}`;
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = value;
      return {
        type: 'animate',
        attributeName: 'text-reveal',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'text-reveal',
      to: value,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const width = maxX - minX;
    const progress = (ctx.state.props.revealProgress as number) ?? 0;
    const color = colorMode === 'dark' ? '#34D399' : '#059669';
    
    // Character reveal visualization
    const numChars = 8;
    const charWidth = width / numChars;
    
    return (
      <g className="text-reveal-gizmo" style={{ pointerEvents: 'none' }}>
        {Array.from({ length: numChars }).map((_, i) => {
          const charProgress = Math.max(0, Math.min(1, (progress * numChars - i)));
          return (
            <rect
              key={i}
              x={minX + i * charWidth + 1 / viewport.zoom}
              y={maxY + 15 / viewport.zoom}
              width={charWidth - 2 / viewport.zoom}
              height={8 / viewport.zoom}
              fill={color}
              opacity={charProgress}
              rx={2 / viewport.zoom}
            />
          );
        })}
        <line
          x1={minX + width * progress}
          y1={maxY + 12 / viewport.zoom}
          x2={minX + width * progress}
          y2={maxY + 26 / viewport.zoom}
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
      </g>
    );
  },
};

// =============================================================================
// Font Variation Gizmo (34)
// =============================================================================

const fontVariationGizmoDefinition: AnimationGizmoDefinition = {
  id: 'font-variation',
  category: 'typography',
  priority: 44,
  
  metadata: {
    name: 'Font Variation',
    description: 'Animate variable font axes (weight, width, etc.)',
    icon: 'bold',
  },
  
  handles: [
    {
      id: 'font-weight',
      type: 'value',
      getPosition: (ctx) => {
        const weight = (ctx.state.props.fontWeight as number) ?? 400;
        const { maxX, minY, maxY } = ctx.elementBounds;
        const normalized = (weight - 100) / 800; // 100-900 range
        return { x: maxX + 20 / ctx.viewport.zoom, y: maxY - (maxY - minY) * normalized };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.fontWeight as number) ?? 400;
        const change = -delta.y / height * 800;
        ctx.updateState({ fontWeight: Math.max(100, Math.min(900, Math.round((current + change) / 100) * 100)) });
      },
      onDragEnd: (ctx) => {
        const fontWeight = ctx.state.props.fontWeight as number;
        const fontWidth = ctx.state.props.fontWidth as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const attrName = (ctx.state.props.originalAttributeName as string) ?? 'font-variation-settings';
        const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
        
        // Update corresponding from/to prop
        if (activeKeyframeIndex === 0) {
          ctx.updateState({ fromWeight: fontWeight });
        } else {
          ctx.updateState({ toWeight: fontWeight });
        }
        
        const value = attrName === 'font-weight' 
          ? String(fontWeight) 
          : `"wght" ${fontWeight}, "wdth" ${fontWidth}`;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = value;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: attrName,
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: attrName,
            to: value,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Font Weight',
    },
    {
      id: 'font-width',
      type: 'value',
      getPosition: (ctx) => {
        const width = (ctx.state.props.fontWidth as number) ?? 100;
        const { maxX, minY, maxY } = ctx.elementBounds;
        const normalized = (width - 50) / 150; // 50-200 range
        return { x: maxX + 35 / ctx.viewport.zoom, y: maxY - (maxY - minY) * normalized };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.fontWidth as number) ?? 100;
        const change = -delta.y / height * 150;
        ctx.updateState({ fontWidth: Math.max(50, Math.min(200, current + change)) });
      },
      onDragEnd: (ctx) => {
        const fontWeight = ctx.state.props.fontWeight as number;
        const fontWidth = ctx.state.props.fontWidth as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const attrName = (ctx.state.props.originalAttributeName as string) ?? 'font-variation-settings';
        const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
        
        // Update corresponding from/to prop
        if (activeKeyframeIndex === 0) {
          ctx.updateState({ fromWidth: fontWidth });
        } else {
          ctx.updateState({ toWidth: fontWidth });
        }
        
        const value = attrName === 'font-weight'
          ? String(fontWeight)
          : `"wght" ${fontWeight}, "wdth" ${fontWidth}`;
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = value;
          ctx.updateAnimation({
            type: 'animate',
            attributeName: attrName,
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'animate',
            attributeName: attrName,
            to: value,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Font Width',
    },
  ],
  
  canHandle: (animation) => {
    return animation.type === 'animate' && 
      (animation.attributeName === 'font-weight' || 
       animation.attributeName === 'font-variation-settings');
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { from, to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    // Parse font weight from animation values
    let fromWeight = 400;
    let toWeight = 400;
    let fromWidth = 100;
    let toWidth = 100;
    
    if (animation.attributeName === 'font-weight') {
      fromWeight = parseFloat(from || '400');
      toWeight = parseFloat(to || '400');
    } else {
      // Parse font-variation-settings format: "wght" 400, "wdth" 100
      const parseVariation = (val: string) => {
        const wMatch = val.match(/wght["']?\s*([\d.]+)/i);
        const dMatch = val.match(/wdth["']?\s*([\d.]+)/i);
        return {
          weight: wMatch ? parseFloat(wMatch[1]) : 400,
          width: dMatch ? parseFloat(dMatch[1]) : 100,
        };
      };
      if (from) {
        const parsed = parseVariation(from);
        fromWeight = parsed.weight;
        fromWidth = parsed.width;
      }
      if (to) {
        const parsed = parseVariation(to);
        toWeight = parsed.weight;
        toWidth = parsed.width;
      }
    }
    
    return {
      gizmoId: 'font-variation',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        fontWeight: toWeight,
        fontWidth: toWidth,
        fromWeight,
        toWeight,
        fromWidth,
        toWidth,
        originalAttributeName: animation.attributeName,
        hasValues,
        keyframes,
        activeKeyframeIndex: 0,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const fromWeight = state.props.fromWeight as number;
    const toWeight = state.props.toWeight as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    const attrName = (state.props.originalAttributeName as string) ?? 'font-variation-settings';
    
    // For plain font-weight, output simple numeric values
    if (attrName === 'font-weight') {
      if (hasValues && keyframes.length > 0) {
        const updatedKeyframes = [...keyframes];
        updatedKeyframes[0] = String(fromWeight);
        updatedKeyframes[updatedKeyframes.length - 1] = String(toWeight);
        return {
          type: 'animate',
          attributeName: 'font-weight',
          values: formatStyleValuesKeyframes(updatedKeyframes),
          from: undefined,
          to: undefined,
        };
      }
      return {
        type: 'animate',
        attributeName: 'font-weight',
        from: String(fromWeight),
        to: String(toWeight),
      };
    }
    
    // For font-variation-settings, use full format
    const fromWidth = state.props.fromWidth as number;
    const toWidth = state.props.toWidth as number;
    const fromValue = `"wght" ${fromWeight}, "wdth" ${fromWidth}`;
    const toValue = `"wght" ${toWeight}, "wdth" ${toWidth}`;
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[0] = fromValue;
      updatedKeyframes[updatedKeyframes.length - 1] = toValue;
      return {
        type: 'animate',
        attributeName: 'font-variation-settings',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'font-variation-settings',
      from: fromValue,
      to: toValue,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { maxX, minY, maxY } = elementBounds;
    const height = maxY - minY;
    const weight = (ctx.state.props.fontWeight as number) ?? 400;
    const width = (ctx.state.props.fontWidth as number) ?? 100;
    const color = colorMode === 'dark' ? '#60A5FA' : '#2563EB';
    const trackBg = colorMode === 'dark' ? '#374151' : '#E5E7EB';
    
    const weightNorm = (weight - 100) / 800;
    const widthNorm = (width - 50) / 150;
    
    return (
      <g className="font-variation-gizmo" style={{ pointerEvents: 'none' }}>
        {/* Weight track */}
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
          y={maxY - height * weightNorm}
          width={6 / viewport.zoom}
          height={height * weightNorm}
          fill={color}
          rx={3 / viewport.zoom}
        />
        <text
          x={maxX + 20 / viewport.zoom}
          y={minY - 5 / viewport.zoom}
          fontSize={8 / viewport.zoom}
          fill={color}
          textAnchor="middle"
        >
          W
        </text>
        
        {/* Width track */}
        <rect
          x={maxX + 32 / viewport.zoom}
          y={minY}
          width={6 / viewport.zoom}
          height={height}
          fill={trackBg}
          rx={3 / viewport.zoom}
        />
        <rect
          x={maxX + 32 / viewport.zoom}
          y={maxY - height * widthNorm}
          width={6 / viewport.zoom}
          height={height * widthNorm}
          fill={colorMode === 'dark' ? '#A78BFA' : '#7C3AED'}
          rx={3 / viewport.zoom}
        />
        <text
          x={maxX + 35 / viewport.zoom}
          y={minY - 5 / viewport.zoom}
          fontSize={8 / viewport.zoom}
          fill={colorMode === 'dark' ? '#A78BFA' : '#7C3AED'}
          textAnchor="middle"
        >
          w
        </text>
      </g>
    );
  },
};

// =============================================================================
// Export
// =============================================================================

export const typographyGizmos = [
  textPathGizmoDefinition,
  letterSpacingGizmoDefinition,
  textRevealGizmoDefinition,
  fontVariationGizmoDefinition,
];
