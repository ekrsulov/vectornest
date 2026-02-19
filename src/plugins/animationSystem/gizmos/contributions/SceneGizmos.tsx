/**
 * Scene Animation Gizmos
 * 
 * Gizmos for camera, timeline, and scene-level animations:
 * - Camera Pan (45): Pan camera across scene
 * - Camera Zoom (46): Zoom camera in/out
 * - Scene Transition (47): Scene transition effects
 * - Timeline Marker (48): Timeline markers and cue points
 * - Loop Control (49): Loop and repeat controls
 * - Sequence (50): Animation sequencing and chaining
 */

import type {
  AnimationGizmoDefinition,
  GizmoState,
} from '../types';
import { createDefaultInteraction } from '../types';
import type { SVGAnimation } from '../../types';

// =============================================================================
// Camera Pan Gizmo (45)
// =============================================================================

const cameraPanGizmoDefinition: AnimationGizmoDefinition = {
  id: 'camera-pan',
  category: 'scene',
  priority: 70,
  
  metadata: {
    name: 'Camera Pan',
    description: 'Pan camera across the scene',
    icon: 'move',
  },
  
  handles: [
    {
      id: 'pan-start',
      type: 'origin',
      getPosition: (ctx) => {
        const startX = (ctx.state.props.panStartX as number) ?? 0;
        const startY = (ctx.state.props.panStartY as number) ?? 0;
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * 0.25 + startX, y: (minY + maxY) / 2 + startY };
      },
      onDrag: (delta, ctx) => {
        const sx = (ctx.state.props.panStartX as number) ?? 0;
        const sy = (ctx.state.props.panStartY as number) ?? 0;
        ctx.updateState({ panStartX: sx + delta.x, panStartY: sy + delta.y });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'camera-pan',
          to: JSON.stringify({
            start: [ctx.state.props.panStartX, ctx.state.props.panStartY],
            end: [ctx.state.props.panEndX, ctx.state.props.panEndY],
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Pan Start',
    },
    {
      id: 'pan-end',
      type: 'origin',
      getPosition: (ctx) => {
        const endX = (ctx.state.props.panEndX as number) ?? 100;
        const endY = (ctx.state.props.panEndY as number) ?? 0;
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * 0.75 + endX, y: (minY + maxY) / 2 + endY };
      },
      onDrag: (delta, ctx) => {
        const ex = (ctx.state.props.panEndX as number) ?? 100;
        const ey = (ctx.state.props.panEndY as number) ?? 0;
        ctx.updateState({ panEndX: ex + delta.x, panEndY: ey + delta.y });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'camera-pan',
          to: JSON.stringify({
            start: [ctx.state.props.panStartX, ctx.state.props.panStartY],
            end: [ctx.state.props.panEndX, ctx.state.props.panEndY],
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Pan End',
    },
  ],
  
  canHandle: (animation) => animation.type === 'custom' && animation.attributeName === 'camera-pan',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'camera-pan',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { panStartX: 0, panStartY: 0, panEndX: 100, panEndY: 0 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'custom',
    attributeName: 'camera-pan',
    to: JSON.stringify({
      start: [state.props.panStartX, state.props.panStartY],
      end: [state.props.panEndX, state.props.panEndY],
    }),
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const w = maxX - minX;
    const sx = minX + w * 0.25 + ((ctx.state.props.panStartX as number) ?? 0);
    const sy = (minY + maxY) / 2 + ((ctx.state.props.panStartY as number) ?? 0);
    const ex = minX + w * 0.75 + ((ctx.state.props.panEndX as number) ?? 100);
    const ey = (minY + maxY) / 2 + ((ctx.state.props.panEndY as number) ?? 0);
    const color = colorMode === 'dark' ? '#60A5FA' : '#2563EB';
    
    return (
      <g className="camera-pan-gizmo">
        {/* Pan path */}
        <line
          x1={sx}
          y1={sy}
          x2={ex}
          y2={ey}
          stroke={color}
          strokeWidth={2 / viewport.zoom}
          strokeDasharray={`${5 / viewport.zoom} ${3 / viewport.zoom}`}
          markerEnd="url(#arrowhead)"
        />
        {/* Start marker */}
        <rect
          x={sx - 8 / viewport.zoom}
          y={sy - 6 / viewport.zoom}
          width={16 / viewport.zoom}
          height={12 / viewport.zoom}
          fill="none"
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
          rx={2 / viewport.zoom}
        />
        <circle cx={sx} cy={sy} r={2 / viewport.zoom} fill={color} />
        {/* End marker */}
        <rect
          x={ex - 8 / viewport.zoom}
          y={ey - 6 / viewport.zoom}
          width={16 / viewport.zoom}
          height={12 / viewport.zoom}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
          rx={2 / viewport.zoom}
        />
      </g>
    );
  },
};

// =============================================================================
// Camera Zoom Gizmo (46)
// =============================================================================

const cameraZoomGizmoDefinition: AnimationGizmoDefinition = {
  id: 'camera-zoom',
  category: 'scene',
  priority: 68,
  
  metadata: {
    name: 'Camera Zoom',
    description: 'Zoom camera in or out',
    icon: 'zoom-in',
  },
  
  handles: [
    {
      id: 'zoom-level',
      type: 'scale',
      getPosition: (ctx) => {
        const zoom = (ctx.state.props.zoomLevel as number) ?? 1;
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const offset = 40 * zoom / ctx.viewport.zoom;
        return { x: cx + offset, y: cy - offset };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.zoomLevel as number) ?? 1;
        const change = (delta.x - delta.y) / 100;
        ctx.updateState({ zoomLevel: Math.max(0.1, Math.min(5, current + change)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'camera-zoom',
          to: JSON.stringify({
            zoom: ctx.state.props.zoomLevel,
            center: [ctx.state.props.zoomCenterX, ctx.state.props.zoomCenterY],
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'nwse-resize',
      tooltip: 'Zoom Level',
    },
    {
      id: 'zoom-center',
      type: 'origin',
      getPosition: (ctx) => {
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const ox = (ctx.state.props.zoomCenterX as number) ?? 0.5;
        const oy = (ctx.state.props.zoomCenterY as number) ?? 0.5;
        return { x: minX + (maxX - minX) * ox, y: minY + (maxY - minY) * oy };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const w = maxX - minX;
        const h = maxY - minY;
        const ox = (ctx.state.props.zoomCenterX as number) ?? 0.5;
        const oy = (ctx.state.props.zoomCenterY as number) ?? 0.5;
        ctx.updateState({
          zoomCenterX: Math.max(0, Math.min(1, ox + delta.x / w)),
          zoomCenterY: Math.max(0, Math.min(1, oy + delta.y / h)),
        });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'camera-zoom',
          to: JSON.stringify({
            zoom: ctx.state.props.zoomLevel,
            center: [ctx.state.props.zoomCenterX, ctx.state.props.zoomCenterY],
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Zoom Center',
    },
  ],
  
  canHandle: (animation) => animation.type === 'custom' && animation.attributeName === 'camera-zoom',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'camera-zoom',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { zoomLevel: 1, zoomCenterX: 0.5, zoomCenterY: 0.5 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'custom',
    attributeName: 'camera-zoom',
    to: JSON.stringify({
      zoom: state.props.zoomLevel,
      center: [state.props.zoomCenterX, state.props.zoomCenterY],
    }),
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const zoom = (ctx.state.props.zoomLevel as number) ?? 1;
    const ox = (ctx.state.props.zoomCenterX as number) ?? 0.5;
    const oy = (ctx.state.props.zoomCenterY as number) ?? 0.5;
    const cx = minX + (maxX - minX) * ox;
    const cy = minY + (maxY - minY) * oy;
    const color = colorMode === 'dark' ? '#A78BFA' : '#7C3AED';
    const size = 30 * zoom / viewport.zoom;
    
    return (
      <g className="camera-zoom-gizmo">
        {/* Zoom frame */}
        <rect
          x={cx - size}
          y={cy - size * 0.75}
          width={size * 2}
          height={size * 1.5}
          fill="none"
          stroke={color}
          strokeWidth={2 / viewport.zoom}
          rx={3 / viewport.zoom}
        />
        {/* Center crosshair */}
        <line
          x1={cx - 5 / viewport.zoom}
          y1={cy}
          x2={cx + 5 / viewport.zoom}
          y2={cy}
          stroke={color}
          strokeWidth={1 / viewport.zoom}
        />
        <line
          x1={cx}
          y1={cy - 5 / viewport.zoom}
          x2={cx}
          y2={cy + 5 / viewport.zoom}
          stroke={color}
          strokeWidth={1 / viewport.zoom}
        />
        {/* Zoom indicator */}
        <text
          x={cx + size + 5 / viewport.zoom}
          y={cy}
          fontSize={10 / viewport.zoom}
          fill={color}
          dominantBaseline="middle"
        >
          {zoom.toFixed(1)}x
        </text>
      </g>
    );
  },
};

// =============================================================================
// Scene Transition Gizmo (47)
// =============================================================================

const sceneTransitionGizmoDefinition: AnimationGizmoDefinition = {
  id: 'scene-transition',
  category: 'scene',
  priority: 66,
  
  metadata: {
    name: 'Scene Transition',
    description: 'Scene transition effects (fade, wipe, etc.)',
    icon: 'arrow-right-left',
  },
  
  handles: [
    {
      id: 'transition-progress',
      type: 'timing',
      getPosition: (ctx) => {
        const progress = (ctx.state.props.transitionProgress as number) ?? 0.5;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * progress, y: maxY + 25 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.transitionProgress as number) ?? 0.5;
        ctx.updateState({ transitionProgress: Math.max(0, Math.min(1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'scene-transition',
          to: JSON.stringify({
            progress: ctx.state.props.transitionProgress,
            type: ctx.state.props.transitionType,
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Transition Progress',
    },
  ],
  
  canHandle: (animation) => animation.type === 'custom' && animation.attributeName === 'scene-transition',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'scene-transition',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { transitionProgress: 0.5, transitionType: 'fade' },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'custom',
    attributeName: 'scene-transition',
    to: JSON.stringify({
      progress: state.props.transitionProgress,
      type: state.props.transitionType,
    }),
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const width = maxX - minX;
    const progress = (ctx.state.props.transitionProgress as number) ?? 0.5;
    const color = colorMode === 'dark' ? '#34D399' : '#059669';
    
    // Transition visualization - two overlapping scenes
    const sceneWidth = 25 / viewport.zoom;
    const sceneHeight = 18 / viewport.zoom;
    const y = maxY + 35 / viewport.zoom;
    
    return (
      <g className="scene-transition-gizmo">
        {/* Scene A (fading out) */}
        <rect
          x={minX + width * 0.3 - sceneWidth / 2}
          y={y}
          width={sceneWidth}
          height={sceneHeight}
          fill={color}
          opacity={1 - progress}
          rx={2 / viewport.zoom}
        />
        <text
          x={minX + width * 0.3}
          y={y + sceneHeight / 2 + 3 / viewport.zoom}
          fontSize={8 / viewport.zoom}
          fill="white"
          textAnchor="middle"
          opacity={1 - progress}
        >
          A
        </text>
        
        {/* Scene B (fading in) */}
        <rect
          x={minX + width * 0.7 - sceneWidth / 2}
          y={y}
          width={sceneWidth}
          height={sceneHeight}
          fill={color}
          opacity={progress}
          rx={2 / viewport.zoom}
        />
        <text
          x={minX + width * 0.7}
          y={y + sceneHeight / 2 + 3 / viewport.zoom}
          fontSize={8 / viewport.zoom}
          fill="white"
          textAnchor="middle"
          opacity={progress}
        >
          B
        </text>
        
        {/* Progress track */}
        <line
          x1={minX}
          y1={maxY + 22 / viewport.zoom}
          x2={maxX}
          y2={maxY + 22 / viewport.zoom}
          stroke={color}
          strokeWidth={3 / viewport.zoom}
          strokeLinecap="round"
          opacity={0.3}
        />
        <line
          x1={minX}
          y1={maxY + 22 / viewport.zoom}
          x2={minX + width * progress}
          y2={maxY + 22 / viewport.zoom}
          stroke={color}
          strokeWidth={3 / viewport.zoom}
          strokeLinecap="round"
        />
      </g>
    );
  },
};

// =============================================================================
// Timeline Marker Gizmo (48)
// =============================================================================

const timelineMarkerGizmoDefinition: AnimationGizmoDefinition = {
  id: 'timeline-marker',
  category: 'scene',
  priority: 64,
  
  metadata: {
    name: 'Timeline Marker',
    description: 'Add markers and cue points to timeline',
    icon: 'flag',
  },
  
  handles: [
    {
      id: 'marker-position',
      type: 'timing',
      getPosition: (ctx) => {
        const position = (ctx.state.props.markerPosition as number) ?? 0.5;
        const { minX, maxX, minY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * position, y: minY - 20 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.markerPosition as number) ?? 0.5;
        ctx.updateState({ markerPosition: Math.max(0, Math.min(1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'timeline-marker',
          to: JSON.stringify({
            position: ctx.state.props.markerPosition,
            label: ctx.state.props.markerLabel,
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Marker Position',
    },
  ],
  
  canHandle: (animation) => animation.type === 'custom' && animation.attributeName === 'timeline-marker',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'timeline-marker',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { markerPosition: 0.5, markerLabel: 'Marker' },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'custom',
    attributeName: 'timeline-marker',
    to: JSON.stringify({
      position: state.props.markerPosition,
      label: state.props.markerLabel,
    }),
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY } = elementBounds;
    const width = maxX - minX;
    const position = (ctx.state.props.markerPosition as number) ?? 0.5;
    const x = minX + width * position;
    const color = colorMode === 'dark' ? '#FB923C' : '#EA580C';
    
    return (
      <g className="timeline-marker-gizmo">
        {/* Timeline bar */}
        <rect
          x={minX}
          y={minY - 12 / viewport.zoom}
          width={width}
          height={6 / viewport.zoom}
          fill={colorMode === 'dark' ? '#374151' : '#D1D5DB'}
          rx={3 / viewport.zoom}
        />
        
        {/* Marker flag */}
        <path
          d={`M ${x} ${minY - 5 / viewport.zoom} L ${x} ${minY - 25 / viewport.zoom} L ${x + 12 / viewport.zoom} ${minY - 18 / viewport.zoom} L ${x} ${minY - 11 / viewport.zoom}`}
          fill={color}
          stroke={color}
          strokeWidth={1 / viewport.zoom}
        />
        
        {/* Marker line extending down */}
        <line
          x1={x}
          y1={minY - 5 / viewport.zoom}
          x2={x}
          y2={minY + 10 / viewport.zoom}
          stroke={color}
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
        />
        
        {/* Time label */}
        <text
          x={x}
          y={minY - 28 / viewport.zoom}
          fontSize={8 / viewport.zoom}
          fill={color}
          textAnchor="middle"
        >
          {(position * 100).toFixed(0)}%
        </text>
      </g>
    );
  },
};

// =============================================================================
// Loop Control Gizmo (49)
// =============================================================================

const loopControlGizmoDefinition: AnimationGizmoDefinition = {
  id: 'loop-control',
  category: 'scene',
  priority: 62,
  
  metadata: {
    name: 'Loop Control',
    description: 'Control loop and repeat behavior',
    icon: 'repeat',
  },
  
  handles: [
    {
      id: 'loop-start',
      type: 'timing',
      getPosition: (ctx) => {
        const start = (ctx.state.props.loopStart as number) ?? 0;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * start, y: maxY + 20 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.loopStart as number) ?? 0;
        const end = (ctx.state.props.loopEnd as number) ?? 1;
        ctx.updateState({ loopStart: Math.max(0, Math.min(end - 0.1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          repeatCount: ctx.state.props.repeatCount as number | 'indefinite',
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Loop Start',
    },
    {
      id: 'loop-end',
      type: 'timing',
      getPosition: (ctx) => {
        const end = (ctx.state.props.loopEnd as number) ?? 1;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * end, y: maxY + 20 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const start = (ctx.state.props.loopStart as number) ?? 0;
        const current = (ctx.state.props.loopEnd as number) ?? 1;
        ctx.updateState({ loopEnd: Math.max(start + 0.1, Math.min(1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          repeatCount: ctx.state.props.repeatCount as number | 'indefinite',
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Loop End',
    },
  ],
  
  canHandle: (animation) => animation.repeatCount !== undefined || animation.repeatCount === 'indefinite',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'loop-control',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { loopStart: 0, loopEnd: 1, repeatCount: animation.repeatCount ?? 1 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    repeatCount: state.props.repeatCount as number | 'indefinite',
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const width = maxX - minX;
    const start = (ctx.state.props.loopStart as number) ?? 0;
    const end = (ctx.state.props.loopEnd as number) ?? 1;
    const color = colorMode === 'dark' ? '#818CF8' : '#4F46E5';
    const y = maxY + 18 / viewport.zoom;
    
    return (
      <g className="loop-control-gizmo">
        {/* Full track */}
        <rect
          x={minX}
          y={y}
          width={width}
          height={4 / viewport.zoom}
          fill={colorMode === 'dark' ? '#374151' : '#D1D5DB'}
          rx={2 / viewport.zoom}
        />
        
        {/* Loop region */}
        <rect
          x={minX + width * start}
          y={y}
          width={width * (end - start)}
          height={4 / viewport.zoom}
          fill={color}
          rx={2 / viewport.zoom}
        />
        
        {/* Loop arrows */}
        <path
          d={`M ${minX + width * start + 5 / viewport.zoom} ${y + 12 / viewport.zoom} 
              C ${minX + width * (start + end) / 2} ${y + 20 / viewport.zoom} 
              ${minX + width * (start + end) / 2} ${y + 20 / viewport.zoom} 
              ${minX + width * end - 5 / viewport.zoom} ${y + 12 / viewport.zoom}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
          markerEnd="url(#arrowhead)"
        />
        
        {/* Start/end handles */}
        <circle
          cx={minX + width * start}
          cy={y + 2 / viewport.zoom}
          r={4 / viewport.zoom}
          fill="white"
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
        <circle
          cx={minX + width * end}
          cy={y + 2 / viewport.zoom}
          r={4 / viewport.zoom}
          fill="white"
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
      </g>
    );
  },
};

// =============================================================================
// Sequence Gizmo (50)
// =============================================================================

const sequenceGizmoDefinition: AnimationGizmoDefinition = {
  id: 'sequence',
  category: 'scene',
  priority: 60,
  
  metadata: {
    name: 'Sequence',
    description: 'Animation sequencing and chaining',
    icon: 'list-ordered',
  },
  
  handles: [
    {
      id: 'sequence-delay',
      type: 'timing',
      getPosition: (ctx) => {
        const delay = (ctx.state.props.sequenceDelay as number) ?? 0;
        const { minX, maxX, minY } = ctx.elementBounds;
        const width = maxX - minX;
        return { x: minX + Math.min(delay * 50, width * 0.4), y: minY - 15 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.sequenceDelay as number) ?? 0;
        ctx.updateState({ sequenceDelay: Math.max(0, current + delta.x / 50) });
      },
      onDragEnd: (ctx) => {
        const chainTo = ctx.state.props.chainTo as string | null;
        ctx.updateAnimation({
          begin: chainTo ? `${chainTo}.end+${ctx.state.props.sequenceDelay}s` : `${ctx.state.props.sequenceDelay}s`,
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Sequence Delay',
    },
    {
      id: 'sequence-order',
      type: 'value',
      getPosition: (ctx) => {
        const order = (ctx.state.props.sequenceOrder as number) ?? 1;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 20 / ctx.viewport.zoom, y: minY + (maxY - minY) * (order - 1) / 9 };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.sequenceOrder as number) ?? 1;
        ctx.updateState({ sequenceOrder: Math.max(1, Math.min(10, Math.round(current + delta.y / height * 9))) });
      },
      onDragEnd: (ctx) => {
        const chainTo = ctx.state.props.chainTo as string | null;
        ctx.updateAnimation({
          begin: chainTo ? `${chainTo}.end+${ctx.state.props.sequenceDelay}s` : `${ctx.state.props.sequenceDelay}s`,
        });
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Sequence Order',
    },
  ],
  
  canHandle: (animation) => animation.type === 'set' || Boolean(animation.begin?.includes('end')),
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'sequence',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { sequenceDelay: 0, sequenceOrder: 1, chainTo: null },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const chainTo = state.props.chainTo as string | null;
    return {
      begin: chainTo ? `${chainTo}.end+${state.props.sequenceDelay}s` : `${state.props.sequenceDelay}s`,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const delay = (ctx.state.props.sequenceDelay as number) ?? 0;
    const order = (ctx.state.props.sequenceOrder as number) ?? 1;
    const color = colorMode === 'dark' ? '#F472B6' : '#DB2777';
    
    // Sequence visualization
    const blockWidth = 20 / viewport.zoom;
    const blockHeight = 12 / viewport.zoom;
    const gap = 8 / viewport.zoom;
    
    return (
      <g className="sequence-gizmo">
        {/* Delay visualization */}
        {delay > 0 && (
          <>
            <line
              x1={minX}
              y1={minY - 12 / viewport.zoom}
              x2={minX + delay * 50}
              y2={minY - 12 / viewport.zoom}
              stroke={color}
              strokeWidth={2 / viewport.zoom}
              strokeDasharray={`${3 / viewport.zoom} ${2 / viewport.zoom}`}
            />
            <text
              x={minX + delay * 25}
              y={minY - 18 / viewport.zoom}
              fontSize={8 / viewport.zoom}
              fill={color}
              textAnchor="middle"
            >
              +{delay.toFixed(1)}s
            </text>
          </>
        )}
        
        {/* Sequence blocks */}
        {Array.from({ length: 3 }).map((_, i) => {
          const isActive = i + 1 === order;
          return (
            <g key={i}>
              <rect
                x={maxX + 15 / viewport.zoom}
                y={minY + i * (blockHeight + gap)}
                width={blockWidth}
                height={blockHeight}
                fill={isActive ? color : 'transparent'}
                stroke={color}
                strokeWidth={1.5 / viewport.zoom}
                rx={2 / viewport.zoom}
              />
              <text
                x={maxX + 15 / viewport.zoom + blockWidth / 2}
                y={minY + i * (blockHeight + gap) + blockHeight / 2 + 3 / viewport.zoom}
                fontSize={8 / viewport.zoom}
                fill={isActive ? 'white' : color}
                textAnchor="middle"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
        
        {/* Chain connector */}
        <path
          d={`M ${maxX + 5 / viewport.zoom} ${(minY + maxY) / 2} L ${maxX + 12 / viewport.zoom} ${(minY + maxY) / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
          markerEnd="url(#arrowhead)"
        />
      </g>
    );
  },
};

// =============================================================================
// Export
// =============================================================================

export const sceneGizmos = [
  cameraPanGizmoDefinition,
  cameraZoomGizmoDefinition,
  sceneTransitionGizmoDefinition,
  timelineMarkerGizmoDefinition,
  loopControlGizmoDefinition,
  sequenceGizmoDefinition,
];
