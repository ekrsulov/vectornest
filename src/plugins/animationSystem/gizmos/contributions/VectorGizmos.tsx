/**
 * Vector Animation Gizmos
 * 
 * Gizmos for vector-specific animations:
 * - Motion Path (05): Movement along SVG paths
 * - Morphing (06): Shape-to-shape transitions
 * - Stroke Draw (07): Progressive stroke reveal
 */

import type {
  AnimationGizmoDefinition,
  GizmoState,
  GizmoHandle,
  GizmoContext,
  GizmoRenderContext,
  GizmoInteractionContext,
} from '../types';
import { createDefaultInteraction } from '../types';
import type { SVGAnimation } from '../../types';
import type { Command, Point } from '../../../../types';
import { formatToPrecision } from '../../../../utils';
import { parsePathD } from '../../../../utils/path';

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
// Motion Path Gizmo (05)
// =============================================================================

const DEFAULT_MOTION_PATH = 'M 0 0 L 100 0';
const SUPPORTED_MOTION_PATH_COMMANDS = new Set(['M', 'm', 'L', 'l', 'C', 'c', 'Z', 'z']);

function hasUnsupportedPathCommands(d: string): boolean {
  const commandLetters = d.match(/[MmZzLlHhVvCcSsQqTtAa]/g) ?? [];
  return commandLetters.some((cmd) => !SUPPORTED_MOTION_PATH_COMMANDS.has(cmd));
}

function formatPathNumber(value: number, precision: number): string {
  return String(formatToPrecision(value, precision));
}

function serializeMotionPath(commands: Command[], precision: number): string {
  return commands
    .map((cmd) => {
      if (cmd.type === 'M' || cmd.type === 'L') {
        return `${cmd.type} ${formatPathNumber(cmd.position.x, precision)} ${formatPathNumber(cmd.position.y, precision)}`;
      }
      if (cmd.type === 'C') {
        return `C ${formatPathNumber(cmd.controlPoint1.x, precision)} ${formatPathNumber(cmd.controlPoint1.y, precision)} ${formatPathNumber(cmd.controlPoint2.x, precision)} ${formatPathNumber(cmd.controlPoint2.y, precision)} ${formatPathNumber(cmd.position.x, precision)} ${formatPathNumber(cmd.position.y, precision)}`;
      }
      if (cmd.type === 'Z') {
        return 'Z';
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

type MotionPathPointKey = 'pos' | 'cp1' | 'cp2';

function getMotionPathD(ctx: Pick<GizmoContext, 'state' | 'animation'>): string {
  const rawPath =
    typeof ctx.state.props.path === 'string'
      ? ctx.state.props.path
      : typeof ctx.animation.path === 'string'
        ? ctx.animation.path
        : '';
  const trimmed = rawPath.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_MOTION_PATH;
}

function getRotateValue(ctx: Pick<GizmoContext, 'state'>): SVGAnimation['rotate'] {
  const autoRotate = Boolean(ctx.state.props.autoRotate);
  const autoReverse = Boolean(ctx.state.props.autoReverse);
  return autoReverse ? 'auto-reverse' : autoRotate ? 'auto' : 0;
}

function getPointFromCommands(commands: Command[], commandIndex: number, key: MotionPathPointKey): Point | null {
  const cmd = commands[commandIndex];
  if (!cmd) return null;

  if ((cmd.type === 'M' || cmd.type === 'L') && key === 'pos') {
    return cmd.position;
  }

  if (cmd.type === 'C') {
    if (key === 'pos') return cmd.position;
    if (key === 'cp1') return cmd.controlPoint1;
    if (key === 'cp2') return cmd.controlPoint2;
  }

  return null;
}

function applyDeltaToCommandsPoint(
  commands: Command[],
  commandIndex: number,
  key: MotionPathPointKey,
  delta: Point,
  precision: number
): void {
  const cmd = commands[commandIndex];
  if (!cmd) return;

  const apply = (p: Point) => {
    p.x = formatToPrecision(p.x + delta.x, precision);
    p.y = formatToPrecision(p.y + delta.y, precision);
  };

  if ((cmd.type === 'M' || cmd.type === 'L') && key === 'pos') {
    apply(cmd.position);
    return;
  }

  if (cmd.type === 'C') {
    if (key === 'pos') apply(cmd.position);
    if (key === 'cp1') apply(cmd.controlPoint1);
    if (key === 'cp2') apply(cmd.controlPoint2);
  }
}

function buildMotionPathHandles(ctx: GizmoContext): GizmoHandle[] {
  if (ctx.animation.type !== 'animateMotion') return [];
  if (ctx.animation.mpath) return [];

  const pathD = getMotionPathD(ctx);
  if (hasUnsupportedPathCommands(pathD)) return [];

  const commands = parsePathD(pathD);
  if (commands.length === 0) return [];

  const lastPointCommandIndex =
    [...commands]
      .map((c, i) => ({ c, i }))
      .reverse()
      .find(({ c }) => c.type === 'M' || c.type === 'L' || c.type === 'C')?.i ?? 0;

  const handles: GizmoHandle[] = [];

  commands.forEach((cmd, commandIndex) => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      const id =
        cmd.type === 'M' && commandIndex === 0
          ? 'path-start'
          : cmd.type === 'L' && commandIndex === lastPointCommandIndex
            ? 'path-end'
            : `anchor-${commandIndex}`;
      handles.push({
        id,
        type: 'path',
        getPosition: (context) => {
          const d = getMotionPathD(context);
          if (hasUnsupportedPathCommands(d)) return context.elementCenter;
          const cmds = parsePathD(d);
          const p = getPointFromCommands(cmds, commandIndex, 'pos') ?? { x: 0, y: 0 };
          return {
            x: context.elementCenter.x + p.x,
            y: context.elementCenter.y + p.y,
          };
        },
        cursor: 'move',
        tooltip: cmd.type === 'M' ? 'Motion Path Start' : 'Motion Path Point',
        onDrag: (delta, context) => {
          const d = getMotionPathD(context);
          if (hasUnsupportedPathCommands(d)) return;

          const cmds = parsePathD(d);
          applyDeltaToCommandsPoint(cmds, commandIndex, 'pos', delta, context.precision);
          context.updateState({ path: serializeMotionPath(cmds, context.precision) });
        },
        onDragEnd: (context) => {
          const nextPath = getMotionPathD(context);
          context.updateAnimation({
            path: nextPath,
            mpath: undefined,
            rotate: getRotateValue(context),
          });
          context.commitChanges();
        },
      });
    } else if (cmd.type === 'C') {
      const makeControlHandle = (key: MotionPathPointKey, handleId: string, tooltip: string): GizmoHandle => ({
        id: handleId,
        type: key === 'pos' ? 'path' : 'tangent',
        getPosition: (context) => {
          const d = getMotionPathD(context);
          if (hasUnsupportedPathCommands(d)) return context.elementCenter;
          const cmds = parsePathD(d);
          const p = getPointFromCommands(cmds, commandIndex, key) ?? { x: 0, y: 0 };
          return {
            x: context.elementCenter.x + p.x,
            y: context.elementCenter.y + p.y,
          };
        },
        cursor: 'move',
        tooltip,
        onDrag: (delta, context) => {
          const d = getMotionPathD(context);
          if (hasUnsupportedPathCommands(d)) return;

          const cmds = parsePathD(d);
          applyDeltaToCommandsPoint(cmds, commandIndex, key, delta, context.precision);
          context.updateState({ path: serializeMotionPath(cmds, context.precision) });
        },
        onDragEnd: (context) => {
          const nextPath = getMotionPathD(context);
          context.updateAnimation({
            path: nextPath,
            mpath: undefined,
            rotate: getRotateValue(context),
          });
          context.commitChanges();
        },
      });

      handles.push(
        makeControlHandle('cp1', `control-1-${commandIndex}`, 'Control Point 1'),
        makeControlHandle('cp2', `control-2-${commandIndex}`, 'Control Point 2'),
        makeControlHandle(
          'pos',
          commandIndex === lastPointCommandIndex ? 'path-end' : `end-${commandIndex}`,
          'Path Point'
        )
      );
    }
  });

  return handles;
}

export const motionPathGizmoDefinition: AnimationGizmoDefinition = {
  id: 'motion-path',
  category: 'vector',
  priority: 50,
  
  metadata: {
    name: 'Motion Path',
    description: 'Animate element along an SVG path',
    icon: 'route',
    keyboardShortcut: 'M',
  },
  
  handles: buildMotionPathHandles,
  
  canHandle: (animation) => {
    return animation.type === 'animateMotion';
  },
  
  fromAnimation: (animation, element): GizmoState => {
    // Parse motion path from animation
    const path = animation.mpath ? '' : (animation.path?.trim() ? animation.path : DEFAULT_MOTION_PATH);
    
    return {
      gizmoId: 'motion-path',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: {
        path,
        mpath: animation.mpath,
        autoRotate: animation.rotate === 'auto' || animation.rotate === 'auto-reverse',
        autoReverse: animation.rotate === 'auto-reverse',
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const path = typeof state.props.path === 'string' ? state.props.path : '';
    const mpath = typeof state.props.mpath === 'string' ? state.props.mpath : undefined;
    const autoRotate = Boolean(state.props.autoRotate);
    const autoReverse = Boolean(state.props.autoReverse);

    return mpath
      ? {
          type: 'animateMotion',
          mpath,
          path: undefined,
          rotate: autoReverse ? 'auto-reverse' : autoRotate ? 'auto' : 0,
        }
      : {
          type: 'animateMotion',
          path: path.trim() ? path : DEFAULT_MOTION_PATH,
          mpath: undefined,
          rotate: autoReverse ? 'auto-reverse' : autoRotate ? 'auto' : 0,
        };
  },
  
  render: (ctx: GizmoRenderContext) => {
    const { elementCenter, viewport, colorMode, animation } = ctx;
    const strokeWidth = 1.5 / viewport.zoom;
    const pathColor = colorMode === 'dark' ? '#F59E0B' : '#D97706';
    const dashArray = `${4 / viewport.zoom} ${2 / viewport.zoom}`;

    if (animation.mpath) {
      return (
        <g className="motion-path-gizmo" data-gizmo="motion-path">
          <text
            x={elementCenter.x}
            y={elementCenter.y - 24 / viewport.zoom}
            fontSize={10 / viewport.zoom}
            fill={pathColor}
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
          >
            mpath: #{animation.mpath}
          </text>
          <text
            x={elementCenter.x}
            y={elementCenter.y - 12 / viewport.zoom}
            fontSize={8 / viewport.zoom}
            fill={colorMode === 'dark' ? '#FCD34D' : '#92400E'}
            textAnchor="middle"
            style={{ pointerEvents: 'none' }}
          >
            Edita el path referenciado
          </text>
        </g>
      );
    }

    const pathD = getMotionPathD(ctx);
    const isSupported = !hasUnsupportedPathCommands(pathD);

    // Optional: show control lines + direction arrow for supported paths
    let controlLines: React.ReactNode = null;
    let directionArrow: React.ReactNode = null;
    const unsupportedNotice = !isSupported ? (
      <text
        x={elementCenter.x}
        y={elementCenter.y - 12 / viewport.zoom}
        fontSize={8 / viewport.zoom}
        fill={colorMode === 'dark' ? '#FCD34D' : '#92400E'}
        textAnchor="middle"
        style={{ pointerEvents: 'none' }}
      >
        Edit solo M/L/C/Z
      </text>
    ) : null;

    if (isSupported) {
      const commands = parsePathD(pathD);

      const abs = (p: Point) => ({ x: elementCenter.x + p.x, y: elementCenter.y + p.y });
      const lineStrokeWidth = strokeWidth * 0.5;

      const segments: React.ReactNode[] = [];
      let current: Point | null = null;
      commands.forEach((cmd, idx) => {
        if (cmd.type === 'M') {
          current = cmd.position;
          return;
        }
        if (cmd.type === 'C' && current) {
          const startAbs = abs(current);
          const cp1Abs = abs(cmd.controlPoint1);
          const cp2Abs = abs(cmd.controlPoint2);
          const endAbs = abs(cmd.position);

          segments.push(
            <line
              key={`cp1-${idx}`}
              x1={startAbs.x}
              y1={startAbs.y}
              x2={cp1Abs.x}
              y2={cp1Abs.y}
              stroke={pathColor}
              strokeWidth={lineStrokeWidth}
              opacity={0.5}
              style={{ pointerEvents: 'none' }}
            />,
            <line
              key={`cp2-${idx}`}
              x1={endAbs.x}
              y1={endAbs.y}
              x2={cp2Abs.x}
              y2={cp2Abs.y}
              stroke={pathColor}
              strokeWidth={lineStrokeWidth}
              opacity={0.5}
              style={{ pointerEvents: 'none' }}
            />
          );
          current = cmd.position;
          return;
        }
        if (cmd.type === 'L' && current) {
          current = cmd.position;
          return;
        }
        if (cmd.type === 'Z') {
          current = null;
        }
      });

      controlLines = segments.length > 0 ? <g>{segments}</g> : null;

      // Direction arrow (uses last drawable segment)
      const lastIndex = [...commands].map((c, i) => ({ c, i })).reverse().find(({ c }) => c.type === 'L' || c.type === 'C');
      if (lastIndex) {
        const lastCmd = lastIndex.c;
        if (lastCmd.type !== 'L' && lastCmd.type !== 'C') {
          return;
        }
        const endRel = lastCmd.position;
        const endAbs = abs(endRel);

        let dir: Point = { x: 1, y: 0 };
        if (lastCmd.type === 'L') {
          const prev = commands
            .slice(0, lastIndex.i)
            .reverse()
            .find((c) => c.type === 'M' || c.type === 'L' || c.type === 'C') as Command | undefined;
          const prevPos =
            prev?.type === 'C'
              ? prev.position
              : prev?.type === 'L' || prev?.type === 'M'
                ? prev.position
                : undefined;
          if (prevPos) {
            dir = { x: endRel.x - prevPos.x, y: endRel.y - prevPos.y };
          }
        } else if (lastCmd.type === 'C') {
          dir = { x: endRel.x - lastCmd.controlPoint2.x, y: endRel.y - lastCmd.controlPoint2.y };
        }

        const len = Math.hypot(dir.x, dir.y) || 1;
        const ux = dir.x / len;
        const uy = dir.y / len;
        const px = -uy;
        const py = ux;

        const size = 10 / viewport.zoom;
        const base = { x: endAbs.x - ux * size, y: endAbs.y - uy * size };
        const left = { x: base.x + px * (size * 0.6), y: base.y + py * (size * 0.6) };
        const right = { x: base.x - px * (size * 0.6), y: base.y - py * (size * 0.6) };

        directionArrow = (
          <polygon
            points={`${endAbs.x},${endAbs.y} ${left.x},${left.y} ${right.x},${right.y}`}
            fill={pathColor}
            opacity={0.9}
            style={{ pointerEvents: 'none' }}
          />
        );
      }
    }

    return (
      <g className="motion-path-gizmo" data-gizmo="motion-path">
        <path
          d={pathD}
          transform={`translate(${elementCenter.x} ${elementCenter.y})`}
          fill="none"
          stroke={pathColor}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          style={{ pointerEvents: 'none' }}
        />
        {unsupportedNotice}
        {controlLines}
        {directionArrow}
      </g>
    );
  },
};

// =============================================================================
// Stroke Draw Gizmo (07)
// =============================================================================

const strokeDrawHandles: GizmoHandle[] = [
  {
    id: 'draw-start',
    type: 'value',
    getPosition: (ctx) => {
      const startOffset = (ctx.state.props.startOffset as number) ?? 0;
      const { minX, maxX, minY } = ctx.elementBounds;
      const width = maxX - minX;
      return { 
        x: minX + width * startOffset, 
        y: minY - 25 / ctx.viewport.zoom,
      };
    },
    onDrag: (delta, ctx) => {
      const { minX, maxX } = ctx.elementBounds;
      const width = maxX - minX;
      const current = (ctx.state.props.startOffset as number) ?? 0;
      const progress = (ctx.state.props.drawProgress as number) ?? 1;
      const newStart = Math.max(0, Math.min(progress - 0.01, current + delta.x / width));
      ctx.updateState({ startOffset: newStart });
    },
    onDragEnd: (ctx) => {
      const totalLength = ctx.state.props.totalLength as number;
      const progress = ctx.state.props.drawProgress as number;
      const startOffset = ctx.state.props.startOffset as number;
      const hasValues = ctx.state.props.hasValues as boolean;
      const keyframes = ctx.state.props.keyframes as string[];
      
      const fromValue = totalLength * (1 - startOffset);
      const toValue = totalLength * (1 - progress);
      
      if (hasValues && keyframes.length > 0) {
        const updatedKeyframes = [...keyframes];
        updatedKeyframes[0] = String(fromValue);
        ctx.updateAnimation({
          values: formatStyleValuesKeyframes(updatedKeyframes),
          from: undefined,
          to: undefined,
        });
      } else {
        ctx.updateAnimation({
          from: String(fromValue),
          to: String(toValue),
        });
      }
      ctx.commitChanges();
    },
    cursor: 'ew-resize',
    tooltip: 'Draw Start Position',
  },
  {
    id: 'draw-end',
    type: 'value',
    getPosition: (ctx) => {
      const progress = (ctx.state.props.drawProgress as number) ?? 1;
      const { minX, maxX, minY } = ctx.elementBounds;
      const width = maxX - minX;
      return { 
        x: minX + width * progress, 
        y: minY - 25 / ctx.viewport.zoom,
      };
    },
    onDrag: (delta, ctx) => {
      const { minX, maxX } = ctx.elementBounds;
      const width = maxX - minX;
      const current = (ctx.state.props.drawProgress as number) ?? 1;
      const startOffset = (ctx.state.props.startOffset as number) ?? 0;
      const newProgress = Math.max(startOffset + 0.01, Math.min(1, current + delta.x / width));
      ctx.updateState({ drawProgress: newProgress });
    },
    onDragEnd: (ctx) => {
      const totalLength = ctx.state.props.totalLength as number;
      const progress = ctx.state.props.drawProgress as number;
      const startOffset = ctx.state.props.startOffset as number;
      const hasValues = ctx.state.props.hasValues as boolean;
      const keyframes = ctx.state.props.keyframes as string[];
      
      const fromValue = totalLength * (1 - startOffset);
      const toValue = totalLength * (1 - progress);
      
      if (hasValues && keyframes.length > 0) {
        const updatedKeyframes = [...keyframes];
        updatedKeyframes[updatedKeyframes.length - 1] = String(toValue);
        ctx.updateAnimation({
          values: formatStyleValuesKeyframes(updatedKeyframes),
          from: undefined,
          to: undefined,
        });
      } else {
        ctx.updateAnimation({
          from: String(fromValue),
          to: String(toValue),
        });
      }
      ctx.commitChanges();
    },
    cursor: 'ew-resize',
    tooltip: 'Draw End Position',
  },
];

export const strokeDrawGizmoDefinition: AnimationGizmoDefinition = {
  id: 'stroke-draw',
  category: 'vector',
  priority: 45,
  
  metadata: {
    name: 'Stroke Draw',
    description: 'Animate stroke drawing with dasharray/dashoffset',
    icon: 'pencil',
    keyboardShortcut: 'D',
  },
  
  handles: strokeDrawHandles,
  
  canHandle: (animation) => {
    return (
      animation.type === 'animate' &&
      (animation.attributeName === 'stroke-dashoffset' ||
       animation.attributeName === 'stroke-dasharray')
    );
  },
  
  fromAnimation: (animation, element): GizmoState => {
    // Parse from/to values to get progress
    const { from, to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    const fromNum = parseFloat(from || '100');
    const toNum = parseFloat(to || '0');
    const progress = 1 - toNum / fromNum;
    
    return {
      gizmoId: 'stroke-draw',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: {
        drawProgress: progress,
        startOffset: 0,
        totalLength: fromNum,
        hasValues,
        keyframes,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const totalLength = (state.props.totalLength as number) ?? 100;
    const progress = (state.props.drawProgress as number) ?? 0;
    const startOffset = (state.props.startOffset as number) ?? 0;
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    const fromValue = totalLength * (1 - startOffset);
    const toValue = totalLength * (1 - progress);
    
    if (hasValues && keyframes.length > 0) {
      const updatedKeyframes = [...keyframes];
      updatedKeyframes[0] = String(fromValue);
      updatedKeyframes[updatedKeyframes.length - 1] = String(toValue);
      return {
        type: 'animate',
        attributeName: 'stroke-dashoffset',
        values: formatStyleValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'stroke-dashoffset',
      from: String(fromValue),
      to: String(toValue),
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    const { minX, maxX, minY, maxY: _maxY } = elementBounds;
    const width = maxX - minX;
    const progressColor = colorMode === 'dark' ? '#10B981' : '#059669';
    const handleColor = colorMode === 'dark' ? '#34D399' : '#10B981';
    
    const progress = (ctx.state.props.drawProgress as number) ?? 0;
    const startOffset = (ctx.state.props.startOffset as number) ?? 0;
    const hasValues = ctx.state.props.hasValues as boolean;
    const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
    
    return (
      <g className="stroke-draw-gizmo">
        {/* Progress track */}
        <rect
          x={minX}
          y={minY - 25 / viewport.zoom}
          width={width}
          height={6 / viewport.zoom}
          fill={colorMode === 'dark' ? '#374151' : '#E5E7EB'}
          rx={3 / viewport.zoom}
        />
        
        {/* Progress fill */}
        <rect
          x={minX + width * startOffset}
          y={minY - 25 / viewport.zoom}
          width={width * (progress - startOffset)}
          height={6 / viewport.zoom}
          fill={progressColor}
          rx={3 / viewport.zoom}
        />
        
        {/* Intermediate keyframes (if multi-keyframe) */}
        {hasValues && keyframes.length > 2 && keyframes.slice(1, -1).map((_, i) => {
          const kfIndex = i + 1;
          const kfProgress = kfIndex / (keyframes.length - 1);
          return (
            <g key={`kf-${kfIndex}`}>
              <line
                x1={minX + width * kfProgress}
                y1={minY - 28 / viewport.zoom}
                x2={minX + width * kfProgress}
                y2={minY - 22 / viewport.zoom}
                stroke={colorMode === 'dark' ? '#6B7280' : '#9CA3AF'}
                strokeWidth={1.5 / viewport.zoom}
              />
              <circle
                cx={minX + width * kfProgress}
                cy={minY - 25 / viewport.zoom}
                r={2 / viewport.zoom}
                fill={handleColor}
              />
            </g>
          );
        })}
        
        {/* Start handle indicator */}
        <circle
          cx={minX + width * startOffset}
          cy={minY - 25 / viewport.zoom}
          r={4 / viewport.zoom}
          fill={handleColor}
          stroke={colorMode === 'dark' ? '#1F2937' : '#F3F4F6'}
          strokeWidth={1.5 / viewport.zoom}
        />
        
        {/* End handle indicator */}
        <circle
          cx={minX + width * progress}
          cy={minY - 25 / viewport.zoom}
          r={4 / viewport.zoom}
          fill={handleColor}
          stroke={colorMode === 'dark' ? '#1F2937' : '#F3F4F6'}
          strokeWidth={1.5 / viewport.zoom}
        />
        
        {/* Labels */}
        <text
          x={minX + width * startOffset}
          y={minY - 32 / viewport.zoom}
          fontSize={9 / viewport.zoom}
          fill={colorMode === 'dark' ? '#9CA3AF' : '#6B7280'}
          textAnchor="middle"
        >
          {Math.round(startOffset * 100)}%
        </text>
        <text
          x={minX + width * progress}
          y={minY - 32 / viewport.zoom}
          fontSize={9 / viewport.zoom}
          fill={colorMode === 'dark' ? '#9CA3AF' : '#6B7280'}
          textAnchor="middle"
        >
          {Math.round(progress * 100)}%
        </text>
      </g>
    );
  },
};

// =============================================================================
// Morphing Gizmo (06) - Shape Morphing with Keyframes
// =============================================================================

type MorphPathPointKey = 'pos' | 'cp1' | 'cp2';

/**
 * Get the path data for the first frame (used as reference for bounding box)
 */
function getFirstMorphPath(ctx: Pick<GizmoContext, 'state'>): string {
  const hasValues = ctx.state.props.hasValues as boolean;
  const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
  const fromPath = ctx.state.props.fromPath as string;
  
  if (hasValues && keyframes.length > 0) {
    return keyframes[0] ?? '';
  }
  
  return fromPath;
}

/**
 * Get the path data for the active keyframe
 */
function getActiveMorphPath(ctx: Pick<GizmoContext, 'state'>): string {
  const hasValues = ctx.state.props.hasValues as boolean;
  const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
  const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
  const fromPath = ctx.state.props.fromPath as string;
  const toPath = ctx.state.props.toPath as string;
  
  if (hasValues && keyframes.length > 0) {
    return keyframes[activeKeyframeIndex] ?? '';
  }
  
  return activeKeyframeIndex === 0 ? fromPath : toPath;
}

/**
 * Serialize morph path commands back to string
 */
function serializeMorphPath(commands: Command[], precision: number): string {
  return commands
    .map((cmd) => {
      if (cmd.type === 'M' || cmd.type === 'L') {
        return `${cmd.type} ${formatPathNumber(cmd.position.x, precision)} ${formatPathNumber(cmd.position.y, precision)}`;
      }
      if (cmd.type === 'C') {
        return `C ${formatPathNumber(cmd.controlPoint1.x, precision)} ${formatPathNumber(cmd.controlPoint1.y, precision)} ${formatPathNumber(cmd.controlPoint2.x, precision)} ${formatPathNumber(cmd.controlPoint2.y, precision)} ${formatPathNumber(cmd.position.x, precision)} ${formatPathNumber(cmd.position.y, precision)}`;
      }
      if (cmd.type === 'Z') {
        return 'Z';
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * Build handles for morphing animation - allows visual editing of active keyframe path
 */
function buildMorphingHandles(ctx: GizmoContext): GizmoHandle[] {
  const pathD = getActiveMorphPath(ctx);
  if (!pathD || hasUnsupportedPathCommands(pathD)) return [];

  const commands = parsePathD(pathD);
  if (commands.length === 0) return [];

  // Calculate first frame's bounding box (matches elementBounds)
  const firstPath = getFirstMorphPath(ctx);
  const firstCommands = parsePathD(firstPath);
  
  let firstPathMinX = Infinity;
  let firstPathMinY = Infinity;
  
  firstCommands.forEach((cmd) => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      firstPathMinX = Math.min(firstPathMinX, cmd.position.x);
      firstPathMinY = Math.min(firstPathMinY, cmd.position.y);
    } else if (cmd.type === 'C') {
      firstPathMinX = Math.min(firstPathMinX, cmd.controlPoint1.x, cmd.controlPoint2.x, cmd.position.x);
      firstPathMinY = Math.min(firstPathMinY, cmd.controlPoint1.y, cmd.controlPoint2.y, cmd.position.y);
    }
  });

  const lastPointCommandIndex =
    [...commands]
      .map((c, i) => ({ c, i }))
      .reverse()
      .find(({ c }) => c.type === 'M' || c.type === 'L' || c.type === 'C')?.i ?? 0;

  const handles: GizmoHandle[] = [];

  commands.forEach((cmd, commandIndex) => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      const id =
        cmd.type === 'M' && commandIndex === 0
          ? 'morph-start'
          : cmd.type === 'L' && commandIndex === lastPointCommandIndex
            ? 'morph-end'
            : `morph-anchor-${commandIndex}`;
      
      handles.push({
        id,
        type: 'path',
        getPosition: (context) => {
          const d = getActiveMorphPath(context);
          if (!d || hasUnsupportedPathCommands(d)) return { x: context.elementBounds.minX, y: context.elementBounds.minY };
          const cmds = parsePathD(d);
          const p = getPointFromCommands(cmds, commandIndex, 'pos') ?? { x: 0, y: 0 };
          
          // Calculate FIRST frame's bounding box for offset (matches elementBounds)
          const firstPath = getFirstMorphPath(context);
          const firstCmds = parsePathD(firstPath);
          let firstMinX = Infinity;
          let firstMinY = Infinity;
          firstCmds.forEach((c) => {
            if (c.type === 'M' || c.type === 'L') {
              firstMinX = Math.min(firstMinX, c.position.x);
              firstMinY = Math.min(firstMinY, c.position.y);
            } else if (c.type === 'C') {
              firstMinX = Math.min(firstMinX, c.controlPoint1.x, c.controlPoint2.x, c.position.x);
              firstMinY = Math.min(firstMinY, c.controlPoint1.y, c.controlPoint2.y, c.position.y);
            }
          });
          
          const offsetX = context.elementBounds.minX - firstMinX;
          const offsetY = context.elementBounds.minY - firstMinY;
          
          return {
            x: p.x + offsetX,
            y: p.y + offsetY,
          };
        },
        cursor: 'move',
        tooltip: cmd.type === 'M' ? 'Morph Path Start' : 'Morph Path Point',
        onDrag: (delta, context) => {
          const d = getActiveMorphPath(context);
          if (!d || hasUnsupportedPathCommands(d)) return;

          const cmds = parsePathD(d);
          applyDeltaToCommandsPoint(cmds, commandIndex, 'pos', delta, context.precision);
          
          const newPath = serializeMorphPath(cmds, context.precision);
          updateActiveMorphPath(context, newPath);
        },
        onDragEnd: (context) => {
          commitMorphPathChanges(context);
        },
      });
    } else if (cmd.type === 'C') {
      const makeControlHandle = (key: MorphPathPointKey, handleId: string, tooltip: string): GizmoHandle => ({
        id: handleId,
        type: key === 'pos' ? 'path' : 'tangent',
        getPosition: (context) => {
          const d = getActiveMorphPath(context);
          if (!d || hasUnsupportedPathCommands(d)) return { x: context.elementBounds.minX, y: context.elementBounds.minY };
          const cmds = parsePathD(d);
          const p = getPointFromCommands(cmds, commandIndex, key) ?? { x: 0, y: 0 };
          
          // Calculate FIRST frame's bounding box for offset (matches elementBounds)
          const firstPath = getFirstMorphPath(context);
          const firstCmds = parsePathD(firstPath);
          let firstMinX = Infinity;
          let firstMinY = Infinity;
          firstCmds.forEach((c) => {
            if (c.type === 'M' || c.type === 'L') {
              firstMinX = Math.min(firstMinX, c.position.x);
              firstMinY = Math.min(firstMinY, c.position.y);
            } else if (c.type === 'C') {
              firstMinX = Math.min(firstMinX, c.controlPoint1.x, c.controlPoint2.x, c.position.x);
              firstMinY = Math.min(firstMinY, c.controlPoint1.y, c.controlPoint2.y, c.position.y);
            }
          });
          
          const offsetX = context.elementBounds.minX - firstMinX;
          const offsetY = context.elementBounds.minY - firstMinY;
          
          return {
            x: p.x + offsetX,
            y: p.y + offsetY,
          };
        },
        cursor: 'move',
        tooltip,
        onDrag: (delta, context) => {
          const d = getActiveMorphPath(context);
          if (!d || hasUnsupportedPathCommands(d)) return;

          const cmds = parsePathD(d);
          applyDeltaToCommandsPoint(cmds, commandIndex, key, delta, context.precision);
          
          const newPath = serializeMorphPath(cmds, context.precision);
          updateActiveMorphPath(context, newPath);
        },
        onDragEnd: (context) => {
          commitMorphPathChanges(context);
        },
      });

      handles.push(
        makeControlHandle('cp1', `morph-control-1-${commandIndex}`, 'Control Point 1'),
        makeControlHandle('cp2', `morph-control-2-${commandIndex}`, 'Control Point 2'),
        makeControlHandle(
          'pos',
          commandIndex === lastPointCommandIndex ? 'morph-end' : `morph-end-${commandIndex}`,
          'Morph Path Point'
        )
      );
    }
  });

  return handles;
}

/**
 * Update the active keyframe path in state
 */
function updateActiveMorphPath(ctx: GizmoInteractionContext, newPath: string): void {
  const hasValues = ctx.state.props.hasValues as boolean;
  const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
  const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
  
  if (hasValues && keyframes.length > 0) {
    const updatedKeyframes = [...keyframes];
    updatedKeyframes[activeKeyframeIndex] = newPath;
    ctx.updateState({ keyframes: updatedKeyframes });
  } else {
    if (activeKeyframeIndex === 0) {
      ctx.updateState({ fromPath: newPath });
    } else {
      ctx.updateState({ toPath: newPath });
    }
  }
}

/**
 * Commit morph path changes to animation
 */
function commitMorphPathChanges(ctx: GizmoInteractionContext): void {
  const hasValues = ctx.state.props.hasValues as boolean;
  const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
  const fromPath = ctx.state.props.fromPath as string;
  const toPath = ctx.state.props.toPath as string;
  
  if (hasValues && keyframes.length > 0) {
    ctx.updateAnimation({
      values: formatStyleValuesKeyframes(keyframes),
      from: undefined,
      to: undefined,
    });
  } else {
    ctx.updateAnimation({
      from: fromPath,
      to: toPath,
    });
  }
  
  ctx.commitChanges();
}

export const morphingGizmoDefinition: AnimationGizmoDefinition = {
  id: 'morphing',
  category: 'vector',
  priority: 55,
  
  metadata: {
    name: 'Shape Morphing',
    description: 'Morph between path shapes with keyframes',
    icon: 'shapes',
    keyboardShortcut: 'P',
  },
  
  handles: buildMorphingHandles,
  
  canHandle: (animation) => {
    return (
      animation.type === 'animate' &&
      animation.attributeName === 'd'
    );
  },
  
  fromAnimation: (animation, element): GizmoState => {
    const { from, to, hasValues, keyframes } = extractStyleAnimationValues(animation);
    
    return {
      gizmoId: 'morphing',
      animationId: animation.id,
      elementId: element.id,
      isFocused: false,
      props: {
        fromPath: from,
        toPath: to,
        hasValues,
        keyframes,
        activeKeyframeIndex: 0,
      },
      interaction: createDefaultInteraction(),
    };
  },
  
  toAnimation: (state): Partial<SVGAnimation> => {
    const hasValues = state.props.hasValues as boolean;
    const keyframes = state.props.keyframes as string[];
    
    if (hasValues && keyframes.length > 0) {
      return {
        type: 'animate',
        attributeName: 'd',
        values: formatStyleValuesKeyframes(keyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animate',
      attributeName: 'd',
      from: state.props.fromPath as string,
      to: state.props.toPath as string,
    };
  },
  
  render: (ctx) => {
    const { elementBounds, viewport, colorMode } = ctx;
    
    const hasValues = ctx.state.props.hasValues as boolean;
    const keyframes = (ctx.state.props.keyframes as string[]) ?? [];
    const activeKeyframeIndex = (ctx.state.props.activeKeyframeIndex as number) ?? 0;
    
    const pathColor = colorMode === 'dark' ? '#8B5CF6' : '#7C3AED';
    const handleColor = colorMode === 'dark' ? '#A78BFA' : '#9333EA';
    const tangentColor = colorMode === 'dark' ? '#6B7280' : '#9CA3AF';
    
    // Determine number of keyframes
    const numKeyframes = hasValues && keyframes.length > 0 ? keyframes.length : 2;
    
    // Get active path and parse it
    const activePath = getActiveMorphPath(ctx);
    if (!activePath || hasUnsupportedPathCommands(activePath)) {
      return (
        <g className="morphing-gizmo">
          <text
            x={(elementBounds.minX + elementBounds.maxX) / 2}
            y={(elementBounds.minY + elementBounds.maxY) / 2}
            fontSize={10 / viewport.zoom}
            fill={pathColor}
            textAnchor="middle"
          >
            Morphing: Frame {activeKeyframeIndex + 1}/{numKeyframes}
          </text>
        </g>
      );
    }
    
    const commands = parsePathD(activePath);
    const pathPoints: Point[] = [];
    const tangentLines: { from: Point; to: Point }[] = [];
    
    // Get first frame path to calculate reference offset
    // elementBounds is based on the first frame, so we need to use it as reference
    const firstPath = getFirstMorphPath(ctx);
    const firstCommands = parsePathD(firstPath);
    
    // Find the FIRST frame's bounding box (this matches elementBounds)
    let firstPathMinX = Infinity;
    let firstPathMinY = Infinity;
    
    firstCommands.forEach((cmd) => {
      if (cmd.type === 'M' || cmd.type === 'L') {
        firstPathMinX = Math.min(firstPathMinX, cmd.position.x);
        firstPathMinY = Math.min(firstPathMinY, cmd.position.y);
      } else if (cmd.type === 'C') {
        firstPathMinX = Math.min(firstPathMinX, cmd.controlPoint1.x, cmd.controlPoint2.x, cmd.position.x);
        firstPathMinY = Math.min(firstPathMinY, cmd.controlPoint1.y, cmd.controlPoint2.y, cmd.position.y);
      }
    });
    
    // Calculate offset from path space to canvas space
    // Use the first frame's bounding box as reference since elementBounds reflects it
    const offsetX = elementBounds.minX - firstPathMinX;
    const offsetY = elementBounds.minY - firstPathMinY;
    
    // Build absolute path by converting path coordinates to canvas coordinates
    let absolutePath = '';
    
    // Collect points, tangent lines, and build absolute path
    commands.forEach((cmd) => {
      if (cmd.type === 'M') {
        const absX = cmd.position.x + offsetX;
        const absY = cmd.position.y + offsetY;
        absolutePath += `M ${absX} ${absY} `;
        pathPoints.push({ x: absX, y: absY });
      } else if (cmd.type === 'L') {
        const absX = cmd.position.x + offsetX;
        const absY = cmd.position.y + offsetY;
        absolutePath += `L ${absX} ${absY} `;
        pathPoints.push({ x: absX, y: absY });
      } else if (cmd.type === 'C') {
        const prevPoint = pathPoints[pathPoints.length - 1];
        const cp1 = {
          x: cmd.controlPoint1.x + offsetX,
          y: cmd.controlPoint1.y + offsetY,
        };
        const cp2 = {
          x: cmd.controlPoint2.x + offsetX,
          y: cmd.controlPoint2.y + offsetY,
        };
        const endPoint = {
          x: cmd.position.x + offsetX,
          y: cmd.position.y + offsetY,
        };
        
        absolutePath += `C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${endPoint.x} ${endPoint.y} `;
        
        if (prevPoint) {
          tangentLines.push({ from: prevPoint, to: cp1 });
        }
        tangentLines.push({ from: cp2, to: endPoint });
        pathPoints.push(endPoint);
      } else if (cmd.type === 'Z') {
        absolutePath += 'Z ';
      }
    });
    
    return (
      <g className="morphing-gizmo">
        {/* Draw the path itself with absolute coordinates */}
        <path
          d={absolutePath.trim()}
          fill="none"
          stroke={pathColor}
          strokeWidth={2 / viewport.zoom}
          opacity={0.5}
        />
        
        {/* Draw tangent lines */}
        {tangentLines.map((line, i) => (
          <line
            key={`tangent-${i}`}
            x1={line.from.x}
            y1={line.from.y}
            x2={line.to.x}
            y2={line.to.y}
            stroke={tangentColor}
            strokeWidth={1 / viewport.zoom}
            strokeDasharray={`${2 / viewport.zoom} ${2 / viewport.zoom}`}
            opacity={0.4}
          />
        ))}
        
        {/* Draw path points */}
        {pathPoints.map((point, i) => (
          <circle
            key={`point-${i}`}
            cx={point.x}
            cy={point.y}
            r={4 / viewport.zoom}
            fill={handleColor}
            stroke={pathColor}
            strokeWidth={1.5 / viewport.zoom}
          />
        ))}
      </g>
    );
  },
};

// =============================================================================
// Registration
// =============================================================================

export const vectorGizmos = [
  motionPathGizmoDefinition,
  morphingGizmoDefinition,
  strokeDrawGizmoDefinition,
];
