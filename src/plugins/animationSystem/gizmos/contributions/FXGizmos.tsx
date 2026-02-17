/**
 * FX (Special Effects) Animation Gizmos
 * 
 * Gizmos for physics-based and special effect animations:
 * - Spring Physics (35): Spring-based motion with stiffness/damping
 * - Particle Emit (36): Particle emission controls
 * - Wave Distortion (37): Wave deformation controls
 * - Noise (38): Noise-based displacement
 * - Parallax (39): Parallax depth layers
 * - Elastic (40): Elastic overshoot animation
 * - Bounce (41): Bounce physics
 * - Jiggle (42): Jiggle/shake effect
 * - Orbit (43): Orbital motion path
 * - Spiral (44): Spiral motion path
 */

import type {
  AnimationGizmoDefinition,
  GizmoState,
} from '../types';
import { createDefaultInteraction } from '../types';
import type { SVGAnimation } from '../../types';

// =============================================================================
// Helper functions for SMIL values attribute support
// =============================================================================

function parseStyleValuesKeyframes(values: string): string[] {
  return values.split(';').map(v => v.trim());
}

function formatStyleValuesKeyframes(keyframes: string[]): string {
  return keyframes.join(';');
}

function extractStyleAnimationValues(animation: SVGAnimation): { from: string; to: string; hasValues: boolean; keyframes: string[] } {
  if (animation.values) {
    const keyframes = parseStyleValuesKeyframes(animation.values);
    return {
      from: keyframes[0] ?? '',
      to: keyframes[keyframes.length - 1] ?? '',
      hasValues: true,
      keyframes,
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
// Spring Physics Gizmo (35)
// =============================================================================

export const springPhysicsGizmoDefinition: AnimationGizmoDefinition = {
  id: 'spring-physics',
  category: 'fx',
  priority: 60,
  
  metadata: {
    name: 'Spring Physics',
    description: 'Spring-based animation with stiffness and damping',
    icon: 'coil',
  },
  
  handles: [
    {
      id: 'stiffness',
      type: 'value',
      getPosition: (ctx) => {
        const stiffness = (ctx.state.props.stiffness as number) ?? 100;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 20 / ctx.viewport.zoom, y: maxY - (maxY - minY) * (stiffness / 500) };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.stiffness as number) ?? 100;
        ctx.updateState({ stiffness: Math.max(10, Math.min(500, current - delta.y / height * 500)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          easing: `spring(${ctx.state.props.stiffness}, ${ctx.state.props.damping}, ${ctx.state.props.mass ?? 1})`,
        });
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Stiffness',
    },
    {
      id: 'damping',
      type: 'value',
      getPosition: (ctx) => {
        const damping = (ctx.state.props.damping as number) ?? 10;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 35 / ctx.viewport.zoom, y: maxY - (maxY - minY) * (damping / 50) };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.damping as number) ?? 10;
        ctx.updateState({ damping: Math.max(1, Math.min(50, current - delta.y / height * 50)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          easing: `spring(${ctx.state.props.stiffness}, ${ctx.state.props.damping}, ${ctx.state.props.mass ?? 1})`,
        });
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Damping',
    },
  ],
  
  canHandle: (animation) => animation.type === 'animate' && Boolean(animation.easing?.startsWith('spring')),
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'spring-physics',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { stiffness: 100, damping: 10, mass: 1 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    easing: `spring(${state.props.stiffness}, ${state.props.damping}, ${state.props.mass ?? 1})`,
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { maxX, minY, maxY } = elementBounds;
    const height = maxY - minY;
    const stiffness = (ctx.state.props.stiffness as number) ?? 100;
    const damping = (ctx.state.props.damping as number) ?? 10;
    const color1 = colorMode === 'dark' ? '#F472B6' : '#DB2777';
    const color2 = colorMode === 'dark' ? '#60A5FA' : '#2563EB';
    
    // Spring coil visualization
    const coils = 5;
    const coilPath = Array.from({ length: coils * 2 + 1 }, (_, i) => {
      const t = i / (coils * 2);
      const x = maxX + 50 / viewport.zoom + Math.sin(t * Math.PI * coils) * 10 / viewport.zoom;
      const y = minY + height * t;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return (
      <g className="spring-physics-gizmo">
        <path
          d={coilPath}
          fill="none"
          stroke={color1}
          strokeWidth={2 / viewport.zoom}
        />
        {/* Stiffness slider */}
        <line
          x1={maxX + 17 / viewport.zoom}
          y1={minY}
          x2={maxX + 17 / viewport.zoom}
          y2={maxY}
          stroke={color1}
          strokeWidth={3 / viewport.zoom}
          strokeLinecap="round"
          opacity={0.3}
        />
        <circle
          cx={maxX + 17 / viewport.zoom}
          cy={maxY - height * (stiffness / 500)}
          r={5 / viewport.zoom}
          fill={color1}
        />
        {/* Damping slider */}
        <line
          x1={maxX + 32 / viewport.zoom}
          y1={minY}
          x2={maxX + 32 / viewport.zoom}
          y2={maxY}
          stroke={color2}
          strokeWidth={3 / viewport.zoom}
          strokeLinecap="round"
          opacity={0.3}
        />
        <circle
          cx={maxX + 32 / viewport.zoom}
          cy={maxY - height * (damping / 50)}
          r={5 / viewport.zoom}
          fill={color2}
        />
      </g>
    );
  },
};

// =============================================================================
// Particle Emit Gizmo (36)
// =============================================================================

export const particleEmitGizmoDefinition: AnimationGizmoDefinition = {
  id: 'particle-emit',
  category: 'fx',
  priority: 58,
  
  metadata: {
    name: 'Particle Emit',
    description: 'Control particle emission origin and spread',
    icon: 'sparkles',
  },
  
  handles: [
    {
      id: 'emit-origin',
      type: 'origin',
      getPosition: (ctx) => {
        const ox = (ctx.state.props.emitX as number) ?? 0.5;
        const oy = (ctx.state.props.emitY as number) ?? 0.5;
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * ox, y: minY + (maxY - minY) * oy };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const w = maxX - minX;
        const h = maxY - minY;
        const ox = (ctx.state.props.emitX as number) ?? 0.5;
        const oy = (ctx.state.props.emitY as number) ?? 0.5;
        ctx.updateState({
          emitX: Math.max(0, Math.min(1, ox + delta.x / w)),
          emitY: Math.max(0, Math.min(1, oy + delta.y / h)),
        });
      },
      onDragEnd: (ctx) => {
        const emitX = ctx.state.props.emitX as number;
        const emitY = ctx.state.props.emitY as number;
        const spreadAngle = ctx.state.props.spreadAngle as number;
        const rate = ctx.state.props.rate as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const value = JSON.stringify({
          origin: [emitX, emitY],
          spread: spreadAngle,
          rate: rate,
        });
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = value;
          ctx.updateAnimation({
            type: 'custom',
            attributeName: 'particle-emit',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'custom',
            attributeName: 'particle-emit',
            to: value,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Emit Origin',
    },
    {
      id: 'spread-angle',
      type: 'rotation',
      getPosition: (ctx) => {
        const spread = (ctx.state.props.spreadAngle as number) ?? 45;
        const ox = (ctx.state.props.emitX as number) ?? 0.5;
        const oy = (ctx.state.props.emitY as number) ?? 0.5;
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const cx = minX + (maxX - minX) * ox;
        const cy = minY + (maxY - minY) * oy;
        const r = 30 / ctx.viewport.zoom;
        return { x: cx + r * Math.cos(spread * Math.PI / 180), y: cy - r * Math.sin(spread * Math.PI / 180) };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.spreadAngle as number) ?? 45;
        ctx.updateState({ spreadAngle: Math.max(5, Math.min(180, current + delta.x * 2)) });
      },
      onDragEnd: (ctx) => {
        const emitX = ctx.state.props.emitX as number;
        const emitY = ctx.state.props.emitY as number;
        const spreadAngle = ctx.state.props.spreadAngle as number;
        const rate = ctx.state.props.rate as number;
        const hasValues = ctx.state.props.hasValues as boolean;
        const keyframes = ctx.state.props.keyframes as string[];
        const value = JSON.stringify({
          origin: [emitX, emitY],
          spread: spreadAngle,
          rate: rate,
        });
        
        if (hasValues && keyframes.length > 0) {
          const updatedKeyframes = [...keyframes];
          updatedKeyframes[updatedKeyframes.length - 1] = value;
          ctx.updateAnimation({
            type: 'custom',
            attributeName: 'particle-emit',
            values: formatStyleValuesKeyframes(updatedKeyframes),
            from: undefined,
            to: undefined,
          });
        } else {
          ctx.updateAnimation({
            type: 'custom',
            attributeName: 'particle-emit',
            to: value,
          });
        }
        ctx.commitChanges();
      },
      cursor: 'grab',
      tooltip: 'Spread Angle',
    },
  ],
  
  canHandle: (animation) => animation.type === 'custom' && animation.attributeName === 'particle-emit',
  
  fromAnimation: (animation, element): GizmoState => {
    const { hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'particle-emit',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: { 
        emitX: 0.5, 
        emitY: 0.5, 
        spreadAngle: 45, 
        rate: 10,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const emitX = state.props.emitX as number;
    const emitY = state.props.emitY as number;
    const spreadAngle = state.props.spreadAngle as number;
    const rate = state.props.rate as number;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    const value = JSON.stringify({
      origin: [emitX, emitY],
      spread: spreadAngle,
      rate: rate,
    });
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[updatedKeyframes.length - 1] = value;
      return {
        type: 'custom',
        attributeName: 'particle-emit',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'custom',
      attributeName: 'particle-emit',
      to: value,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const ox = (ctx.state.props.emitX as number) ?? 0.5;
    const oy = (ctx.state.props.emitY as number) ?? 0.5;
    const spread = (ctx.state.props.spreadAngle as number) ?? 45;
    const cx = minX + (maxX - minX) * ox;
    const cy = minY + (maxY - minY) * oy;
    const color = colorMode === 'dark' ? '#FBBF24' : '#D97706';
    const r = 30 / viewport.zoom;
    
    // Draw emission cone
    const halfSpread = spread / 2;
    const startAngle = -90 - halfSpread;
    const endAngle = -90 + halfSpread;
    
    return (
      <g className="particle-emit-gizmo">
        <path
          d={`M ${cx} ${cy} L ${cx + r * Math.cos(startAngle * Math.PI / 180)} ${cy + r * Math.sin(startAngle * Math.PI / 180)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(endAngle * Math.PI / 180)} ${cy + r * Math.sin(endAngle * Math.PI / 180)} Z`}
          fill={color}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
        />
        <circle cx={cx} cy={cy} r={4 / viewport.zoom} fill={color} />
        {/* Particle dots */}
        {[0.2, 0.5, 0.8].map((t, i) => (
          <circle
            key={i}
            cx={cx + r * t * Math.cos(-90 * Math.PI / 180)}
            cy={cy + r * t * Math.sin(-90 * Math.PI / 180)}
            r={2 / viewport.zoom}
            fill={color}
            opacity={1 - t * 0.6}
          />
        ))}
      </g>
    );
  },
};

// =============================================================================
// Wave Distortion Gizmo (37)
// =============================================================================

export const waveDistortionGizmoDefinition: AnimationGizmoDefinition = {
  id: 'wave-distortion',
  category: 'fx',
  priority: 56,
  
  metadata: {
    name: 'Wave Distortion',
    description: 'Wave-based deformation controls',
    icon: 'waves',
  },
  
  handles: [
    {
      id: 'amplitude',
      type: 'value',
      getPosition: (ctx) => {
        const amplitude = (ctx.state.props.amplitude as number) ?? 10;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: (minX + maxX) / 2, y: maxY + 20 / ctx.viewport.zoom + amplitude };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.amplitude as number) ?? 10;
        ctx.updateState({ amplitude: Math.max(2, Math.min(50, current + delta.y)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'wave-distortion',
          to: JSON.stringify({
            amplitude: ctx.state.props.amplitude,
            frequency: ctx.state.props.frequency,
            phase: ctx.state.props.phase,
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Amplitude',
    },
    {
      id: 'frequency',
      type: 'value',
      getPosition: (ctx) => {
        const frequency = (ctx.state.props.frequency as number) ?? 2;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 15 / ctx.viewport.zoom + frequency * 8, y: (minY + maxY) / 2 };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.frequency as number) ?? 2;
        ctx.updateState({ frequency: Math.max(0.5, Math.min(10, current + delta.x / 8)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'wave-distortion',
          to: JSON.stringify({
            amplitude: ctx.state.props.amplitude,
            frequency: ctx.state.props.frequency,
            phase: ctx.state.props.phase,
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Frequency',
    },
  ],
  
  canHandle: (animation) => animation.type === 'custom' && animation.attributeName === 'wave-distortion',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'wave-distortion',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { amplitude: 10, frequency: 2, phase: 0 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'custom',
    attributeName: 'wave-distortion',
    to: JSON.stringify({
      amplitude: state.props.amplitude,
      frequency: state.props.frequency,
      phase: state.props.phase,
    }),
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const width = maxX - minX;
    const amplitude = (ctx.state.props.amplitude as number) ?? 10;
    const frequency = (ctx.state.props.frequency as number) ?? 2;
    const color = colorMode === 'dark' ? '#818CF8' : '#4F46E5';
    
    // Wave path
    const points = 20;
    const wavePath = Array.from({ length: points + 1 }, (_, i) => {
      const t = i / points;
      const x = minX + width * t;
      const y = maxY + 30 / viewport.zoom + Math.sin(t * Math.PI * 2 * frequency) * amplitude;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return (
      <g className="wave-distortion-gizmo">
        <path
          d={wavePath}
          fill="none"
          stroke={color}
          strokeWidth={2 / viewport.zoom}
        />
        <line
          x1={minX}
          y1={maxY + 30 / viewport.zoom}
          x2={maxX}
          y2={maxY + 30 / viewport.zoom}
          stroke={color}
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${3 / viewport.zoom} ${3 / viewport.zoom}`}
          opacity={0.5}
        />
      </g>
    );
  },
};

// =============================================================================
// Noise Gizmo (38)
// =============================================================================

export const noiseGizmoDefinition: AnimationGizmoDefinition = {
  id: 'noise',
  category: 'fx',
  priority: 54,
  
  metadata: {
    name: 'Noise',
    description: 'Noise-based displacement animation',
    icon: 'radio',
  },
  
  handles: [
    {
      id: 'noise-scale',
      type: 'value',
      getPosition: (ctx) => {
        const scale = (ctx.state.props.noiseScale as number) ?? 1;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 20 / ctx.viewport.zoom, y: maxY - (maxY - minY) * (scale / 5) };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.noiseScale as number) ?? 1;
        ctx.updateState({ noiseScale: Math.max(0.1, Math.min(5, current - delta.y / height * 5)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'noise',
          to: JSON.stringify({
            scale: ctx.state.props.noiseScale,
            intensity: ctx.state.props.noiseIntensity,
            seed: ctx.state.props.seed,
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Noise Scale',
    },
    {
      id: 'noise-intensity',
      type: 'value',
      getPosition: (ctx) => {
        const intensity = (ctx.state.props.noiseIntensity as number) ?? 10;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * (intensity / 50), y: maxY + 25 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.noiseIntensity as number) ?? 10;
        ctx.updateState({ noiseIntensity: Math.max(1, Math.min(50, current + delta.x / width * 50)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'noise',
          to: JSON.stringify({
            scale: ctx.state.props.noiseScale,
            intensity: ctx.state.props.noiseIntensity,
            seed: ctx.state.props.seed,
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Intensity',
    },
  ],
  
  canHandle: (animation) => animation.type === 'custom' && animation.attributeName === 'noise',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'noise',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { noiseScale: 1, noiseIntensity: 10, seed: 0 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'custom',
    attributeName: 'noise',
    to: JSON.stringify({
      scale: state.props.noiseScale,
      intensity: state.props.noiseIntensity,
      seed: state.props.seed,
    }),
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const color = colorMode === 'dark' ? '#34D399' : '#059669';
    
    // Random dots to visualize noise
    const dots = Array.from({ length: 12 }, (_, i) => {
      const seed = (i * 7919) % 100;
      return {
        x: minX + (maxX - minX) * ((seed % 10) / 10),
        y: minY + (maxY - minY) * (Math.floor(seed / 10) / 10),
        r: 2 + (seed % 3),
      };
    });
    
    return (
      <g className="noise-gizmo">
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={dot.r / viewport.zoom}
            fill={color}
            opacity={0.4 + (i % 3) * 0.2}
          />
        ))}
        <rect
          x={minX - 5 / viewport.zoom}
          y={minY - 5 / viewport.zoom}
          width={maxX - minX + 10 / viewport.zoom}
          height={maxY - minY + 10 / viewport.zoom}
          fill="none"
          stroke={color}
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${4 / viewport.zoom} ${2 / viewport.zoom}`}
          opacity={0.5}
        />
      </g>
    );
  },
};

// =============================================================================
// Parallax Gizmo (39)
// =============================================================================

export const parallaxGizmoDefinition: AnimationGizmoDefinition = {
  id: 'parallax',
  category: 'fx',
  priority: 52,
  
  metadata: {
    name: 'Parallax',
    description: 'Parallax depth layer control',
    icon: 'layers',
  },
  
  handles: [
    {
      id: 'depth',
      type: 'value',
      getPosition: (ctx) => {
        const depth = (ctx.state.props.depth as number) ?? 0.5;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 25 / ctx.viewport.zoom, y: maxY - (maxY - minY) * depth };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.depth as number) ?? 0.5;
        ctx.updateState({ depth: Math.max(0, Math.min(1, current - delta.y / height)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'parallax',
          to: JSON.stringify({ depth: ctx.state.props.depth, sensitivity: ctx.state.props.sensitivity }),
        });
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Depth Layer',
    },
  ],
  
  canHandle: (animation) => animation.type === 'custom' && animation.attributeName === 'parallax',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'parallax',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { depth: 0.5, sensitivity: 1 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'custom',
    attributeName: 'parallax',
    to: JSON.stringify({ depth: state.props.depth, sensitivity: state.props.sensitivity }),
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { maxX, minY, maxY } = elementBounds;
    const height = maxY - minY;
    const depth = (ctx.state.props.depth as number) ?? 0.5;
    const color = colorMode === 'dark' ? '#A78BFA' : '#7C3AED';
    
    // Layered rectangles to show depth
    const layers = 3;
    
    return (
      <g className="parallax-gizmo">
        {Array.from({ length: layers }).map((_, i) => {
          const layerDepth = (i + 1) / layers;
          const offset = (depth - 0.5) * 20 * layerDepth / viewport.zoom;
          return (
            <rect
              key={i}
              x={maxX + 15 / viewport.zoom + offset}
              y={minY + i * (height / layers / 2)}
              width={8 / viewport.zoom}
              height={(height / layers) * 0.8}
              fill={color}
              opacity={0.3 + layerDepth * 0.5}
              rx={2 / viewport.zoom}
            />
          );
        })}
        <text
          x={maxX + 28 / viewport.zoom}
          y={maxY + 12 / viewport.zoom}
          fontSize={8 / viewport.zoom}
          fill={color}
        >
          {(depth * 100).toFixed(0)}%
        </text>
      </g>
    );
  },
};

// =============================================================================
// Elastic Gizmo (40)
// =============================================================================

export const elasticGizmoDefinition: AnimationGizmoDefinition = {
  id: 'elastic',
  category: 'fx',
  priority: 50,
  
  metadata: {
    name: 'Elastic',
    description: 'Elastic overshoot animation',
    icon: 'activity',
  },
  
  handles: [
    {
      id: 'elasticity',
      type: 'value',
      getPosition: (ctx) => {
        const elasticity = (ctx.state.props.elasticity as number) ?? 0.5;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * elasticity, y: maxY + 25 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.elasticity as number) ?? 0.5;
        ctx.updateState({ elasticity: Math.max(0.1, Math.min(1, current + delta.x / width)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          easing: `elastic(${ctx.state.props.elasticity}, ${ctx.state.props.oscillations ?? 3})`,
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Elasticity',
    },
  ],
  
  canHandle: (animation) => Boolean(animation.easing?.startsWith('elastic')),
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'elastic',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { elasticity: 0.5, oscillations: 3 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    easing: `elastic(${state.props.elasticity}, ${state.props.oscillations ?? 3})`,
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, maxY } = elementBounds;
    const width = maxX - minX;
    const elasticity = (ctx.state.props.elasticity as number) ?? 0.5;
    const color = colorMode === 'dark' ? '#FB923C' : '#EA580C';
    
    // Elastic curve
    const points = 30;
    const elasticPath = Array.from({ length: points + 1 }, (_, i) => {
      const t = i / points;
      const x = minX + width * t;
      const decay = Math.pow(1 - t, 2);
      const oscillation = Math.sin(t * Math.PI * 4 * elasticity) * decay * 15 / viewport.zoom;
      const y = maxY + 35 / viewport.zoom - oscillation;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return (
      <g className="elastic-gizmo">
        <path d={elasticPath} fill="none" stroke={color} strokeWidth={2 / viewport.zoom} />
        <line
          x1={minX}
          y1={maxY + 35 / viewport.zoom}
          x2={maxX}
          y2={maxY + 35 / viewport.zoom}
          stroke={color}
          strokeWidth={1 / viewport.zoom}
          strokeDasharray={`${3 / viewport.zoom} ${3 / viewport.zoom}`}
          opacity={0.4}
        />
      </g>
    );
  },
};

// =============================================================================
// Bounce Gizmo (41)
// =============================================================================

export const bounceGizmoDefinition: AnimationGizmoDefinition = {
  id: 'bounce',
  category: 'fx',
  priority: 48,
  
  metadata: {
    name: 'Bounce',
    description: 'Bounce physics animation',
    icon: 'arrow-down-circle',
  },
  
  handles: [
    {
      id: 'bounciness',
      type: 'value',
      getPosition: (ctx) => {
        const bounciness = (ctx.state.props.bounciness as number) ?? 0.6;
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        return { x: (minX + maxX) / 2, y: maxY - (maxY - minY) * bounciness * 0.8 };
      },
      onDrag: (delta, ctx) => {
        const { minY, maxY } = ctx.elementBounds;
        const height = maxY - minY;
        const current = (ctx.state.props.bounciness as number) ?? 0.6;
        ctx.updateState({ bounciness: Math.max(0.1, Math.min(1, current - delta.y / height / 0.8)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          easing: `bounce(${ctx.state.props.bounciness}, ${ctx.state.props.gravity ?? 1})`,
        });
        ctx.commitChanges();
      },
      cursor: 'ns-resize',
      tooltip: 'Bounciness',
    },
  ],
  
  canHandle: (animation) => Boolean(animation.easing?.startsWith('bounce')),
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'bounce',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { bounciness: 0.6, gravity: 1 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    easing: `bounce(${state.props.bounciness}, ${state.props.gravity ?? 1})`,
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const width = maxX - minX;
    const height = maxY - minY;
    const bounciness = (ctx.state.props.bounciness as number) ?? 0.6;
    const color = colorMode === 'dark' ? '#4ADE80' : '#16A34A';
    const cx = (minX + maxX) / 2;
    
    // Bounce trajectory
    const bounces = 4;
    let path = `M ${cx} ${minY}`;
    let currentHeight = height;
    let x = cx;
    
    for (let i = 0; i < bounces; i++) {
      const nextHeight = currentHeight * bounciness;
      const segmentWidth = width / bounces / 2;
      x += segmentWidth;
      path += ` Q ${x} ${maxY - nextHeight} ${x + segmentWidth} ${maxY}`;
      x += segmentWidth;
      currentHeight = nextHeight;
    }
    
    return (
      <g className="bounce-gizmo">
        <path d={path} fill="none" stroke={color} strokeWidth={2 / viewport.zoom} />
        <circle cx={cx} cy={minY} r={4 / viewport.zoom} fill={color} />
        <line
          x1={minX}
          y1={maxY}
          x2={maxX}
          y2={maxY}
          stroke={color}
          strokeWidth={1 / viewport.zoom}
          opacity={0.5}
        />
      </g>
    );
  },
};

// =============================================================================
// Jiggle Gizmo (42)
// =============================================================================

export const jiggleGizmoDefinition: AnimationGizmoDefinition = {
  id: 'jiggle',
  category: 'fx',
  priority: 46,
  
  metadata: {
    name: 'Jiggle',
    description: 'Jiggle/shake effect',
    icon: 'vibrate',
  },
  
  handles: [
    {
      id: 'jiggle-amount',
      type: 'value',
      getPosition: (ctx) => {
        const amount = (ctx.state.props.jiggleAmount as number) ?? 5;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 15 / ctx.viewport.zoom + amount * 2, y: (minY + maxY) / 2 };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.jiggleAmount as number) ?? 5;
        ctx.updateState({ jiggleAmount: Math.max(1, Math.min(20, current + delta.x / 2)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'custom',
          attributeName: 'jiggle',
          to: JSON.stringify({ amount: ctx.state.props.jiggleAmount, speed: ctx.state.props.speed }),
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Jiggle Amount',
    },
  ],
  
  canHandle: (animation) => animation.type === 'custom' && animation.attributeName === 'jiggle',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'jiggle',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { jiggleAmount: 5, speed: 10 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'custom',
    attributeName: 'jiggle',
    to: JSON.stringify({ amount: state.props.jiggleAmount, speed: state.props.speed }),
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const amount = (ctx.state.props.jiggleAmount as number) ?? 5;
    const color = colorMode === 'dark' ? '#F87171' : '#DC2626';
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    
    // Jiggle visualization
    const jiggleOffsets = [
      { x: -amount / 2, y: -amount / 3 },
      { x: amount / 2, y: amount / 4 },
      { x: -amount / 3, y: amount / 2 },
      { x: amount / 4, y: -amount / 2 },
    ];
    
    return (
      <g className="jiggle-gizmo">
        {jiggleOffsets.map((offset, i) => (
          <rect
            key={i}
            x={cx + offset.x - 4 / viewport.zoom}
            y={cy + offset.y - 4 / viewport.zoom}
            width={8 / viewport.zoom}
            height={8 / viewport.zoom}
            fill="none"
            stroke={color}
            strokeWidth={1 / viewport.zoom}
            opacity={0.3 + i * 0.15}
            rx={1 / viewport.zoom}
          />
        ))}
        <rect
          x={cx - 5 / viewport.zoom}
          y={cy - 5 / viewport.zoom}
          width={10 / viewport.zoom}
          height={10 / viewport.zoom}
          fill={color}
          rx={2 / viewport.zoom}
        />
      </g>
    );
  },
};

// =============================================================================
// Orbit Gizmo (43)
// =============================================================================

export const orbitGizmoDefinition: AnimationGizmoDefinition = {
  id: 'orbit',
  category: 'fx',
  priority: 44,
  
  metadata: {
    name: 'Orbit',
    description: 'Orbital motion path',
    icon: 'circle-dot',
  },
  
  handles: [
    {
      id: 'orbit-radius',
      type: 'scale',
      getPosition: (ctx) => {
        const radius = (ctx.state.props.orbitRadius as number) ?? 50;
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        return { x: cx + radius, y: cy };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.orbitRadius as number) ?? 50;
        ctx.updateState({ orbitRadius: Math.max(10, current + delta.x) });
      },
      onDragEnd: (ctx) => {
        const r = ctx.state.props.orbitRadius as number;
        const cx = ctx.state.props.centerX as number;
        const cy = ctx.state.props.centerY as number;
        ctx.updateAnimation({
          type: 'animateMotion',
          path: `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`,
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Orbit Radius',
    },
    {
      id: 'orbit-center',
      type: 'origin',
      getPosition: (ctx) => {
        const { minX, maxX, minY, maxY } = ctx.elementBounds;
        return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
      },
      onDrag: (delta, ctx) => {
        const cx = (ctx.state.props.centerX as number) ?? 0;
        const cy = (ctx.state.props.centerY as number) ?? 0;
        ctx.updateState({ centerX: cx + delta.x, centerY: cy + delta.y });
      },
      onDragEnd: (ctx) => {
        const r = ctx.state.props.orbitRadius as number;
        const cx = ctx.state.props.centerX as number;
        const cy = ctx.state.props.centerY as number;
        ctx.updateAnimation({
          type: 'animateMotion',
          path: `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`,
        });
        ctx.commitChanges();
      },
      cursor: 'move',
      tooltip: 'Orbit Center',
    },
  ],
  
  canHandle: (animation) => animation.type === 'animateMotion' && Boolean(animation.path?.includes('A')),
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'orbit',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { orbitRadius: 50, centerX: 0, centerY: 0, speed: 1 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const r = state.props.orbitRadius as number;
    const cx = state.props.centerX as number;
    const cy = state.props.centerY as number;
    return {
      type: 'animateMotion',
      path: `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const radius = (ctx.state.props.orbitRadius as number) ?? 50;
    const cx = (minX + maxX) / 2 + ((ctx.state.props.centerX as number) ?? 0);
    const cy = (minY + maxY) / 2 + ((ctx.state.props.centerY as number) ?? 0);
    const color = colorMode === 'dark' ? '#38BDF8' : '#0284C7';
    
    return (
      <g className="orbit-gizmo">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={1.5 / viewport.zoom}
          strokeDasharray={`${6 / viewport.zoom} ${3 / viewport.zoom}`}
        />
        <circle cx={cx} cy={cy} r={3 / viewport.zoom} fill={color} />
        <circle
          cx={cx + radius}
          cy={cy}
          r={5 / viewport.zoom}
          fill={color}
          stroke="white"
          strokeWidth={1 / viewport.zoom}
        />
      </g>
    );
  },
};

// =============================================================================
// Spiral Gizmo (44)
// =============================================================================

export const spiralGizmoDefinition: AnimationGizmoDefinition = {
  id: 'spiral',
  category: 'fx',
  priority: 42,
  
  metadata: {
    name: 'Spiral',
    description: 'Spiral motion path',
    icon: 'loader',
  },
  
  handles: [
    {
      id: 'spiral-turns',
      type: 'value',
      getPosition: (ctx) => {
        const turns = (ctx.state.props.spiralTurns as number) ?? 3;
        const { minX, maxX, maxY } = ctx.elementBounds;
        return { x: minX + (maxX - minX) * (turns / 10), y: maxY + 20 / ctx.viewport.zoom };
      },
      onDrag: (delta, ctx) => {
        const { minX, maxX } = ctx.elementBounds;
        const width = maxX - minX;
        const current = (ctx.state.props.spiralTurns as number) ?? 3;
        ctx.updateState({ spiralTurns: Math.max(1, Math.min(10, current + delta.x / width * 10)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'animateMotion',
          attributeName: 'spiral',
          to: JSON.stringify({
            turns: ctx.state.props.spiralTurns,
            expansion: ctx.state.props.spiralExpansion,
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Spiral Turns',
    },
    {
      id: 'spiral-expansion',
      type: 'value',
      getPosition: (ctx) => {
        const expansion = (ctx.state.props.spiralExpansion as number) ?? 10;
        const { maxX, minY, maxY } = ctx.elementBounds;
        return { x: maxX + 15 / ctx.viewport.zoom + expansion, y: (minY + maxY) / 2 };
      },
      onDrag: (delta, ctx) => {
        const current = (ctx.state.props.spiralExpansion as number) ?? 10;
        ctx.updateState({ spiralExpansion: Math.max(2, Math.min(30, current + delta.x)) });
      },
      onDragEnd: (ctx) => {
        ctx.updateAnimation({
          type: 'animateMotion',
          attributeName: 'spiral',
          to: JSON.stringify({
            turns: ctx.state.props.spiralTurns,
            expansion: ctx.state.props.spiralExpansion,
          }),
        });
        ctx.commitChanges();
      },
      cursor: 'ew-resize',
      tooltip: 'Expansion Rate',
    },
  ],
  
  canHandle: (animation) => animation.type === 'animateMotion' && animation.attributeName === 'spiral',
  
  fromAnimation: (animation, element): GizmoState => ({
    gizmoId: 'spiral',
    animationId: animation.id,
    elementId: element.id,
    isFocused: false,
    props: { spiralTurns: 3, spiralExpansion: 10 },
    interaction: createDefaultInteraction(),
  }),
  
  toAnimation: (state): Partial<SVGAnimation> => ({
    type: 'animateMotion',
    attributeName: 'spiral',
    to: JSON.stringify({
      turns: state.props.spiralTurns,
      expansion: state.props.spiralExpansion,
    }),
  }),
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY } = elementBounds;
    const turns = (ctx.state.props.spiralTurns as number) ?? 3;
    const expansion = (ctx.state.props.spiralExpansion as number) ?? 10;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const color = colorMode === 'dark' ? '#E879F9' : '#C026D3';
    
    // Spiral path
    const points = turns * 20;
    const spiralPath = Array.from({ length: points + 1 }, (_, i) => {
      const t = i / points;
      const angle = t * Math.PI * 2 * turns;
      const r = 5 + t * expansion * turns;
      const x = cx + r * Math.cos(angle) / viewport.zoom;
      const y = cy + r * Math.sin(angle) / viewport.zoom;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return (
      <g className="spiral-gizmo">
        <path d={spiralPath} fill="none" stroke={color} strokeWidth={1.5 / viewport.zoom} />
        <circle cx={cx} cy={cy} r={3 / viewport.zoom} fill={color} />
      </g>
    );
  },
};

// =============================================================================
// Export
// =============================================================================

export const fxGizmos = [
  springPhysicsGizmoDefinition,
  particleEmitGizmoDefinition,
  waveDistortionGizmoDefinition,
  noiseGizmoDefinition,
  parallaxGizmoDefinition,
  elasticGizmoDefinition,
  bounceGizmoDefinition,
  jiggleGizmoDefinition,
  orbitGizmoDefinition,
  spiralGizmoDefinition,
];
