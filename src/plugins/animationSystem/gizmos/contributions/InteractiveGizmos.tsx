/**
 * Interactive Animation Gizmos
 * 
 * Gizmos for interactive/event-driven animations:
 * - Hover State (27): Animation on hover
 * - Click Trigger (28): Animation on click
 * - Scroll Trigger (29): Scroll-based animation
 * - Focus State (30): Animation on focus
 */

import type {
  AnimationGizmoDefinition,
  GizmoState,
} from '../types';
import { createDefaultInteraction } from '../types';
import type { SVGAnimation } from '../../types';

// =============================================================================
// Hover State Gizmo (27)
// =============================================================================

const hoverStateGizmoDefinition: AnimationGizmoDefinition = {
  id: 'hover-state',
  category: 'interactive',
  priority: 50,
  
  metadata: {
    name: 'Hover State',
    description: 'Animate on mouse hover',
    icon: 'mouse-pointer',
  },
  
  handles: [
    {
      id: 'hover-scale',
      type: 'scale',
      getPosition: (ctx) => {
        const scale = (ctx.state.props.hoverScale as number) ?? 1.1;
        const { maxX, maxY } = ctx.elementBounds;
        return { x: maxX + 10 / ctx.viewport.zoom * scale, y: maxY + 10 / ctx.viewport.zoom * scale };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.hoverScale as number) ?? 1.1;
        ctx.updateState({ hoverScale: Math.max(0.5, current + (delta.x + delta.y) / 100) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'animateTransform',
          attributeName: 'transform',
          attrType: 'scale',
          to: `${ctx.state.props.hoverScale}`,
          begin: 'mouseover',
        });
        ctx.commitChanges();
      },
      cursor: 'nwse-resize',
      tooltip: 'Hover Scale',
    },
  ],
  
  canHandle: (animation) => {
    return animation.begin === 'mouseover' || animation.begin === 'mouseenter';
  },
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'hover-state',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { hoverScale: 1.1 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'animateTransform',
    attributeName: 'transform',
    attrType: 'scale',
    to: `${state.props.hoverScale}`,
    begin: 'mouseover',
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const scale = (ctx.state.props.hoverScale as number) ?? 1.1;
    const color = colorMode === 'dark' ? '#34D399' : '#059669';
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const hw = (maxX - minX) / 2 * scale;
    const hh = (maxY - minY) / 2 * scale;
    
    return (
      <g className="hover-state-gizmo">
        <rect
          x={cx - hw}
          y={cy - hh}
          width={hw * 2}
          height={hh * 2}
          fill="none"
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
          strokeDasharray={`${4 / viewport.zoom} ${2 / viewport.zoom}`}
          opacity={0.6}
        />
        <text
          x={maxX + 15 / viewport.zoom}
          y={minY}
          fontSize={9 / viewport.zoom}
          fill={color}
        >
          hover: {scale.toFixed(2)}x
        </text>
      </g>
    );
  },
};

// =============================================================================
// Click Trigger Gizmo (28)
// =============================================================================

const clickTriggerGizmoDefinition: AnimationGizmoDefinition = {
  id: 'click-trigger',
  category: 'interactive',
  priority: 48,
  
  metadata: {
    name: 'Click Trigger',
    description: 'Trigger animation on click',
    icon: 'pointer',
  },
  
  handles: [
    {
      id: 'click-response',
      type: 'timing',
      getPosition: (ctx) => {
        const duration = (ctx.state.props.clickDuration as number) ?? 0.3;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * duration * 2, y: maxY + 20 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.clickDuration as number) ?? 0.3;
        ctx.updateState({ clickDuration: Math.max(0.1, Math.min(1, current + delta.x / width / 2)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          begin: 'click',
          dur: `${ctx.state.props.clickDuration}s`,
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Click Duration',
    },
  ],
  
  canHandle: (animation) => {
    return animation.begin === 'click';
  },
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'click-trigger',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { clickDuration: 0.3 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    begin: 'click',
    dur: `${state.props.clickDuration}s`,
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const cx = (minX + maxX) / 2;
    const color = colorMode === 'dark' ? '#F472B6' : '#EC4899';
    
    return (
      <g className="click-trigger-gizmo">
        <circle
          cx={cx}
          cy={maxY + 30 / viewport.zoom}
          r={12 / viewport.zoom}
          fill={color}
          opacity={0.2}
        />
        <circle
          cx={cx}
          cy={maxY + 30 / viewport.zoom}
          r={6 / viewport.zoom}
          fill={color}
          opacity={0.4}
        />
        <circle
          cx={cx}
          cy={maxY + 30 / viewport.zoom}
          r={2 / viewport.zoom}
          fill={color}
        />
        <text
          x={cx + 18 / viewport.zoom}
          y={maxY + 33 / viewport.zoom}
          fontSize={9 / viewport.zoom}
          fill={color}
        >
          click
        </text>
      </g>
    );
  },
};

// =============================================================================
// Scroll Trigger Gizmo (29)
// =============================================================================

const scrollTriggerGizmoDefinition: AnimationGizmoDefinition = {
  id: 'scroll-trigger',
  category: 'interactive',
  priority: 46,
  
  metadata: {
    name: 'Scroll Trigger',
    description: 'Animation triggered by scroll position',
    icon: 'arrow-down',
  },
  
  handles: [
    {
      id: 'scroll-start',
      type: 'value',
      getPosition: (ctx) => {
        const start = (ctx.state.props.scrollStart as number) ?? 0;
        const { minX, minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        return { x: minX - 20 / ctx.viewport.zoom, y: minY + height * start };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.scrollStart as number) ?? 0;
        ctx.updateState({ scrollStart: Math.max(0, Math.min(1, current + delta.y / height)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          begin: `scroll(${ctx.state.props.scrollStart}, ${ctx.state.props.scrollEnd})`,
        });
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Scroll Start',
    },
    {
      id: 'scroll-end',
      type: 'value',
      getPosition: (ctx) => {
        const end = (ctx.state.props.scrollEnd as number) ?? 1;
        const { minX, minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        return { x: minX - 20 / ctx.viewport.zoom, y: minY + height * end };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.scrollEnd as number) ?? 1;
        ctx.updateState({ scrollEnd: Math.max(0, Math.min(1, current + delta.y / height)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          begin: `scroll(${ctx.state.props.scrollStart}, ${ctx.state.props.scrollEnd})`,
        });
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Scroll End',
    },
  ],
  
  canHandle: (animation) => {
    return animation.begin?.includes('scroll') ?? false;
  },
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'scroll-trigger',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { scrollStart: 0, scrollEnd: 1 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    begin: `scroll(${state.props.scrollStart}, ${state.props.scrollEnd})`,
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, minY, maxY } = elementBounds;
    const height = maxY - minY;
    const start = (ctx.state.props.scrollStart as number) ?? 0;
    const end = (ctx.state.props.scrollEnd as number) ?? 1;
    const color = colorMode === 'dark' ? '#60A5FA' : '#2563EB';
    
    return (
      <g className="scroll-trigger-gizmo">
        <rect
          x={minX - 25 / viewport.zoom}
          y={minY}
          width={6 / viewport.zoom}
          height={height}
          fill={colorMode === 'dark' ? '#374151' : '#E5E7EB'}
          rx={3 / viewport.zoom}
        />
        <rect
          x={minX - 25 / viewport.zoom}
          y={minY + height * start}
          width={6 / viewport.zoom}
          height={height * (end - start)}
          fill={color}
          rx={3 / viewport.zoom}
        />
        <text
          x={minX - 35 / viewport.zoom}
          y={minY + height * start}
          fontSize={8 / viewport.zoom}
          fill={color}
          textAnchor="end"
        >
          {Math.round(start * 100)}%
        </text>
        <text
          x={minX - 35 / viewport.zoom}
          y={minY + height * end}
          fontSize={8 / viewport.zoom}
          fill={color}
          textAnchor="end"
        >
          {Math.round(end * 100)}%
        </text>
      </g>
    );
  },
};

// =============================================================================
// Focus State Gizmo (30)
// =============================================================================

const focusStateGizmoDefinition: AnimationGizmoDefinition = {
  id: 'focus-state',
  category: 'interactive',
  priority: 44,
  
  metadata: {
    name: 'Focus State',
    description: 'Animate on keyboard focus',
    icon: 'square',
  },
  
  handles: [
    {
      id: 'focus-ring',
      type: 'value',
      getPosition: (ctx) => {
        const ringSize = (ctx.state.props.focusRingSize as number) ?? 4;
        const { maxX, minY } = ctx.elementBounds;
        return { x: maxX + ringSize + 5 / ctx.viewport.zoom, y: minY };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.focusRingSize as number) ?? 4;
        ctx.updateState({ focusRingSize: Math.max(1, current + delta.x / 5) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          begin: 'focus',
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Focus Ring Size',
    },
  ],
  
  canHandle: (animation) => {
    return animation.begin === 'focus' || animation.begin === 'focusin';
  },
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'focus-state',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { focusRingSize: 4 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (_state): Partial<SVGAnimation> => ({
    begin: 'focus',
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const ringSize = (ctx.state.props.focusRingSize as number) ?? 4;
    const color = colorMode === 'dark' ? '#A78BFA' : '#7C3AED';
    
    return (
      <g className="focus-state-gizmo">
        <rect
          x={minX - ringSize}
          y={minY - ringSize}
          width={maxX - minX + ringSize * 2}
          height={maxY - minY + ringSize * 2}
          fill="none"
          stroke={color}
          strokeWidth={2 / viewport.zoom}
          rx={(ringSize + 2) / viewport.zoom}
          opacity={0.7}
        />
        <rect
          x={minX - ringSize - 2 / viewport.zoom}
          y={minY - ringSize - 2 / viewport.zoom}
          width={maxX - minX + ringSize * 2 + 4 / viewport.zoom}
          height={maxY - minY + ringSize * 2 + 4 / viewport.zoom}
          fill="none"
          stroke={color}
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${3 / viewport.zoom} ${2 / viewport.zoom}`}
          rx={(ringSize + 4) / viewport.zoom}
          opacity={0.4}
        />
      </g>
    );
  },
};

// =============================================================================
// Export
// =============================================================================

export const interactiveGizmos = [
  hoverStateGizmoDefinition,
  clickTriggerGizmoDefinition,
  scrollTriggerGizmoDefinition,
  focusStateGizmoDefinition,
];
