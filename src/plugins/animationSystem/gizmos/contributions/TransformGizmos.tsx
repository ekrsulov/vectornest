/**
 * Transform Gizmos - Category I
 * 
 * Gizmo definitions for basic spatial transformations:
 * - 01: Translation (Move)
 * - 02: Rotation
 * - 03: Scale
 * - 04: Skew (Inclinación)
 */

import type { AnimationGizmoDefinition, GizmoRenderContext, GizmoState } from '../types';
import type { SVGAnimation } from '../../types';
import type { CanvasElement } from '../../../../types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse transform value string into array of numbers
 * Handles formats like "0 0", "360 100 100", "1.5", etc.
 */
function parseTransformValue(value: string | number | undefined): number[] {
  if (value === undefined) return [];
  if (typeof value === 'number') return [value];
  return value.split(/[\s,]+/).map(parseFloat).filter((n) => !isNaN(n));
}

/**
 * Format transform value array to string
 */
function formatTransformValue(values: number[], precision = 3): string {
  return values.map((v) => parseFloat(v.toFixed(precision))).join(' ');
}

/**
 * Parse SMIL values attribute into array of keyframes
 * Each keyframe is an array of numbers
 * Example: "0,0; 60,0; -60,0" -> [[0,0], [60,0], [-60,0]]
 */
function parseValuesKeyframes(values: string | undefined): number[][] {
  if (!values) return [];
  return values.split(';').map(v => parseTransformValue(v.trim()));
}

/**
 * Format keyframes array back to SMIL values string
 * Example: [[0,0], [60,0], [-60,0]] -> "0 0; 60 0; -60 0"
 */
function formatValuesKeyframes(keyframes: number[][], precision = 3): string {
  return keyframes.map(kf => formatTransformValue(kf, precision)).join('; ');
}

function clampKeyframeIndex(index: unknown, keyframeCount: number): number {
  if (keyframeCount <= 0) return 0;
  const rawIndex =
    typeof index === 'number' && Number.isFinite(index) ? Math.round(index) : keyframeCount - 1;
  return Math.max(0, Math.min(keyframeCount - 1, rawIndex));
}

function roundNumber(value: number, precision: number): number {
  return parseFloat(value.toFixed(precision));
}

/**
 * Extract from/to values from animation, supporting both from/to and values attributes
 * Returns: { from: number[], to: number[], hasValues: boolean, keyframes: number[][] }
 */
function extractAnimationValues(animation: SVGAnimation): {
  from: number[];
  to: number[];
  hasValues: boolean;
  keyframes: number[][];
} {
  // If animation has values attribute, parse keyframes
  if (animation.values) {
    const keyframes = parseValuesKeyframes(animation.values);
    const from = keyframes[0] ?? [];
    const to = keyframes[keyframes.length - 1] ?? [];
    return { from, to, hasValues: true, keyframes };
  }
  
  // Otherwise use from/to
  const from = parseTransformValue(animation.from);
  const to = parseTransformValue(animation.to);
  return { from, to, hasValues: false, keyframes: [] };
}

// =============================================================================
// 01: Translation Gizmo
// =============================================================================

/**
 * Translation (Move) Gizmo
 * 
 * Visual: Dashed line from origin to destination with ghost element at destination.
 * Interaction: Drag the ghost to define final position.
 * SMIL Target: <animateTransform type="translate">
 */
const translateGizmoDefinition: AnimationGizmoDefinition = {
  id: 'translate',
  category: 'transform',
  label: 'Translation',
  description: 'Move element from one position to another',
  smilTarget: 'animateTransform',
  targetAttributes: ['transform'],

  appliesTo: (animation: SVGAnimation) => {
    return (
      animation.type === 'animateTransform' &&
      animation.transformType === 'translate'
    );
  },

	  handles: [
	    {
	      id: 'destination',
	      type: 'point',
	      visible: (ctx) => {
	        const hasValues = ctx.state.props.hasValues as boolean;
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        return !(hasValues && keyframes.length > 2);
	      },
	      position: (ctx) => {
	        const toX = (ctx.state.props.toX as number) ?? 0;
	        const toY = (ctx.state.props.toY as number) ?? 0;
	        return {
          x: ctx.elementCenter.x + toX,
          y: ctx.elementCenter.y + toY,
        };
      },
      cursor: 'move',
      onDrag: (delta, ctx) => {
        const currentToX = (ctx.state.props.toX as number) ?? 0;
        const currentToY = (ctx.state.props.toY as number) ?? 0;
        ctx.updateState({
          toX: currentToX + delta.x,
          toY: currentToY + delta.y,
        });
      },
      onDragEnd: (ctx) => {
        const hasValues = ctx.state.props.hasValues as boolean;
        const fromX = (ctx.state.props.fromX as number) ?? 0;
        const fromY = (ctx.state.props.fromY as number) ?? 0;
        const toX = (ctx.state.props.toX as number) ?? 0;
        const toY = (ctx.state.props.toY as number) ?? 0;
        
		        if (hasValues) {
		          // Update keyframes preserving the original structure
		          const keyframes = (ctx.state.props.keyframes as number[][]) ?? [[fromX, fromY], [toX, toY]];
		          const updatedKeyframes = [...keyframes];
		          updatedKeyframes[updatedKeyframes.length - 1] = [toX, toY];
		          ctx.updateState({ keyframes: updatedKeyframes });
		          ctx.updateAnimation({
		            values: formatValuesKeyframes(updatedKeyframes, ctx.precision),
		            from: undefined,
		            to: undefined,
		          });
	        } else {
	          ctx.updateAnimation({
	            from: formatTransformValue([fromX, fromY], ctx.precision),
	            to: formatTransformValue([toX, toY], ctx.precision),
	            values: undefined,
	          });
	        }
	        ctx.commitChanges();
	      },
	    },
	    {
	      id: 'keyframe',
	      type: 'point',
	      visible: (ctx) => {
	        const hasValues = ctx.state.props.hasValues as boolean;
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        return hasValues && keyframes.length > 2;
	      },
	      label: (ctx) => {
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);
	        return String(activeIndex + 1);
	      },
	      position: (ctx) => {
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);
	        const kf = keyframes[activeIndex] ?? [];
	        const x = kf[0] ?? 0;
	        const y = kf[1] ?? 0;
	        return {
	          x: ctx.elementCenter.x + x,
	          y: ctx.elementCenter.y + y,
	        };
	      },
	      cursor: 'move',
	      onDrag: (delta, ctx) => {
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);
	        const current = keyframes[activeIndex] ?? [];
	        const currentX = current[0] ?? 0;
	        const currentY = current[1] ?? 0;
	        const nextX = roundNumber(currentX + delta.x, ctx.precision);
	        const nextY = roundNumber(currentY + delta.y, ctx.precision);

	        const updatedKeyframes = [...keyframes];
	        updatedKeyframes[activeIndex] = [nextX, nextY];

	        const first = updatedKeyframes[0] ?? [0, 0];
	        const last = updatedKeyframes[updatedKeyframes.length - 1] ?? first;

	        ctx.updateState({
	          keyframes: updatedKeyframes,
	          fromX: first[0] ?? 0,
	          fromY: first[1] ?? 0,
	          toX: last[0] ?? 0,
	          toY: last[1] ?? 0,
	        });
	      },
	      onDragEnd: (ctx) => {
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        ctx.updateAnimation({
	          values: formatValuesKeyframes(keyframes, ctx.precision),
	          from: undefined,
	          to: undefined,
	        });
	        ctx.commitChanges();
	      },
	    },
	    {
	      id: 'origin',
	      type: 'point',
	      visible: (ctx) => {
	        const hasValues = ctx.state.props.hasValues as boolean;
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        return !(hasValues && keyframes.length > 2);
	      },
	      position: (ctx) => {
	        const fromX = (ctx.state.props.fromX as number) ?? 0;
	        const fromY = (ctx.state.props.fromY as number) ?? 0;
	        return {
          x: ctx.elementCenter.x + fromX,
          y: ctx.elementCenter.y + fromY,
        };
      },
      cursor: 'move',
      onDrag: (delta, ctx) => {
        const currentFromX = (ctx.state.props.fromX as number) ?? 0;
        const currentFromY = (ctx.state.props.fromY as number) ?? 0;
        ctx.updateState({
          fromX: currentFromX + delta.x,
          fromY: currentFromY + delta.y,
        });
      },
      onDragEnd: (ctx) => {
        const hasValues = ctx.state.props.hasValues as boolean;
        const fromX = (ctx.state.props.fromX as number) ?? 0;
        const fromY = (ctx.state.props.fromY as number) ?? 0;
        const toX = (ctx.state.props.toX as number) ?? 0;
        const toY = (ctx.state.props.toY as number) ?? 0;
        
		        if (hasValues) {
		          // Update keyframes preserving the original structure
		          const keyframes = (ctx.state.props.keyframes as number[][]) ?? [[fromX, fromY], [toX, toY]];
		          const updatedKeyframes = [...keyframes];
		          updatedKeyframes[0] = [fromX, fromY];
		          ctx.updateState({ keyframes: updatedKeyframes });
		          ctx.updateAnimation({
		            values: formatValuesKeyframes(updatedKeyframes, ctx.precision),
		            from: undefined,
		            to: undefined,
		          });
	        } else {
	          ctx.updateAnimation({
	            from: formatTransformValue([fromX, fromY], ctx.precision),
	            to: formatTransformValue([toX, toY], ctx.precision),
	            values: undefined,
	          });
	        }
	        ctx.commitChanges();
      },
    },
  ],

  visual: {
    zIndex: 100,
    render: (ctx: GizmoRenderContext) => {
      const { elementCenter, state, colorMode, viewport } = ctx;
      const fromX = (state.props.fromX as number) ?? 0;
      const fromY = (state.props.fromY as number) ?? 0;
	      const toX = (state.props.toX as number) ?? 0;
	      const toY = (state.props.toY as number) ?? 0;
	      const hasValues = state.props.hasValues as boolean;
	      const keyframes = (state.props.keyframes as number[][]) ?? [];
	      const isMultiKeyframeValues = hasValues && keyframes.length > 2;

	      if (isMultiKeyframeValues) {
	        const activeIndex = clampKeyframeIndex(state.props.activeKeyframeIndex, keyframes.length);
	        const kf = keyframes[activeIndex] ?? [];
	        const x = elementCenter.x + (kf[0] ?? 0);
	        const y = elementCenter.y + (kf[1] ?? 0);

	        return (
	          <g className="translate-gizmo" data-gizmo="translate">
	            <line
	              x1={elementCenter.x}
	              y1={elementCenter.y}
	              x2={x}
	              y2={y}
	              stroke={colorMode === 'dark' ? '#63b3ed' : '#3182ce'}
	              strokeWidth={2}
	              strokeDasharray="6 4"
	              markerEnd="url(#gizmo-arrow)"
	              style={{ pointerEvents: 'none' }}
	            />
	            <text
	              x={(elementCenter.x + x) / 2}
	              y={(elementCenter.y + y) / 2 - 10 / viewport.zoom}
	              fontSize={11 / viewport.zoom}
	              fill={colorMode === 'dark' ? '#63b3ed' : '#3182ce'}
	              textAnchor="middle"
	              style={{ pointerEvents: 'none' }}
	            >
	              kf {activeIndex + 1}/{keyframes.length}
	            </text>
	          </g>
	        );
	      }

	      const startX = elementCenter.x + fromX;
	      const startY = elementCenter.y + fromY;
	      const endX = elementCenter.x + toX;
	      const endY = elementCenter.y + toY;

      const strokeColor = colorMode === 'dark' ? '#63b3ed' : '#3182ce';
      const ghostColor = colorMode === 'dark' ? '#4299e1' : '#2b6cb0';
      const intermediateColor = colorMode === 'dark' ? '#F59E0B' : '#D97706';

      // Calculate intermediate keyframe positions
      const intermediatePoints = hasValues && keyframes.length > 2
        ? keyframes.slice(1, -1).map((kf) => ({
            x: elementCenter.x + (kf[0] ?? 0),
            y: elementCenter.y + (kf[1] ?? 0),
          }))
        : [];

      return (
        <g className="translate-gizmo" data-gizmo="translate">
          {/* Multi-keyframe path (when more than 2 keyframes) */}
          {hasValues && keyframes.length > 2 && (
            <path
              d={keyframes.map((kf, i) => {
                const x = elementCenter.x + (kf[0] ?? 0);
                const y = elementCenter.y + (kf[1] ?? 0);
                return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2}
              strokeDasharray="6 4"
              opacity={0.6}
            />
          )}

          {/* Simple trajectory line (for 2 keyframes) */}
          {(!hasValues || keyframes.length <= 2) && (
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={strokeColor}
              strokeWidth={2}
              strokeDasharray="6 4"
              markerEnd="url(#gizmo-arrow)"
            />
          )}

          {/* Intermediate keyframe markers */}
          {intermediatePoints.map((point, i) => (
            <g key={`intermediate-${point.x}-${point.y}`} className="keyframe-marker">
              <circle
                cx={point.x}
                cy={point.y}
                r={8 / viewport.zoom}
                fill={intermediateColor}
                fillOpacity={0.3}
                stroke={intermediateColor}
                strokeWidth={2 / viewport.zoom}
              />
              <text
                x={point.x}
                y={point.y + 3 / viewport.zoom}
                fontSize={8 / viewport.zoom}
                fill={intermediateColor}
                textAnchor="middle"
                fontWeight="bold"
              >
                {i + 2}
              </text>
            </g>
          ))}

          {/* Origin marker (keyframe 1) */}
          <circle
            cx={startX}
            cy={startY}
            r={6}
            fill="white"
            stroke={strokeColor}
            strokeWidth={2}
            data-handle="origin"
            style={{ cursor: 'move' }}
          />
          {hasValues && keyframes.length > 2 && (
            <text
              x={startX}
              y={startY + 3}
              fontSize={8}
              fill={strokeColor}
              textAnchor="middle"
              fontWeight="bold"
            >
              1
            </text>
          )}

          {/* Destination marker (last keyframe) */}
          <g data-handle="destination" style={{ cursor: 'move' }}>
            <rect
              x={endX - 12}
              y={endY - 12}
              width={24}
              height={24}
              fill={ghostColor}
              fillOpacity={0.3}
              stroke={ghostColor}
              strokeWidth={2}
              rx={4}
            />
            <circle
              cx={endX}
              cy={endY}
              r={4}
              fill={ghostColor}
            />
            {hasValues && keyframes.length > 2 && (
              <text
                x={endX}
                y={endY + 3}
                fontSize={8}
                fill="white"
                textAnchor="middle"
                fontWeight="bold"
              >
                {keyframes.length}
              </text>
            )}
          </g>

          {/* Distance/keyframe count label */}
          <text
            x={(startX + endX) / 2}
            y={(startY + endY) / 2 - 10}
            fontSize={11}
            fill={strokeColor}
            textAnchor="middle"
          >
            {hasValues && keyframes.length > 2
              ? `${keyframes.length} keyframes`
              : `Δ${Math.round(Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2))}px`}
          </text>
        </g>
      );
    },
  },

  fromAnimation: (animation: SVGAnimation, element: CanvasElement): GizmoState => {
    const { from, to, hasValues, keyframes } = extractAnimationValues(animation);

    return {
      gizmoId: 'translate',
      animationId: animation.id,
      elementId: element.id,
	      props: {
	        fromX: from[0] ?? 0,
	        fromY: from[1] ?? 0,
	        toX: to[0] ?? 0,
	        toY: to[1] ?? 0,
	        hasValues,
	        keyframes,
	        ...(hasValues && keyframes.length > 2
	          ? { activeKeyframeIndex: keyframes.length - 1 }
	          : {}),
	      },
	      interaction: {
	        activeHandle: null,
	        isDragging: false,
        dragStart: null,
        isHovered: false,
        hoveredHandle: null,
      },
    };
  },

  toAnimation: (state: GizmoState): Partial<SVGAnimation> => {
    const { fromX, fromY, toX, toY, hasValues, keyframes } = state.props;
    const fX = (fromX as number) ?? 0;
    const fY = (fromY as number) ?? 0;
    const tX = (toX as number) ?? 0;
    const tY = (toY as number) ?? 0;
    
    if (hasValues && keyframes) {
      const updatedKeyframes = [...(keyframes as number[][])];
      updatedKeyframes[0] = [fX, fY];
      updatedKeyframes[updatedKeyframes.length - 1] = [tX, tY];
      return {
        type: 'animateTransform',
        transformType: 'translate',
        values: formatValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animateTransform',
      transformType: 'translate',
      from: formatTransformValue([fX, fY]),
      to: formatTransformValue([tX, tY]),
      values: undefined,
    };
  },
};

// =============================================================================
// 02: Rotation Gizmo
// =============================================================================

/**
 * Rotation Gizmo
 * 
 * Visual: Crosshair at pivot point, circular arc showing rotation angle.
 * Interaction: Drag pivot to change center, drag arc to set angle.
 * SMIL Target: <animateTransform type="rotate">
 */
const rotateGizmoDefinition: AnimationGizmoDefinition = {
  id: 'rotate',
  category: 'transform',
  label: 'Rotation',
  description: 'Rotate element around a pivot point',
  smilTarget: 'animateTransform',
  targetAttributes: ['transform'],

  appliesTo: (animation: SVGAnimation) => {
    return (
      animation.type === 'animateTransform' &&
      animation.transformType === 'rotate'
    );
  },

  handles: [
    {
      id: 'pivot',
      type: 'point',
      position: (ctx) => ({
        x: (ctx.state.props.pivotX as number) ?? ctx.elementCenter.x,
        y: (ctx.state.props.pivotY as number) ?? ctx.elementCenter.y,
      }),
      cursor: 'move',
      onDrag: (delta, ctx) => {
        const currentX = (ctx.state.props.pivotX as number) ?? ctx.elementCenter.x;
        const currentY = (ctx.state.props.pivotY as number) ?? ctx.elementCenter.y;
        ctx.updateState({
          pivotX: currentX + delta.x,
          pivotY: currentY + delta.y,
        });
	      },
	      onDragEnd: (ctx) => {
	        const fromDegrees = (ctx.state.props.fromDegrees as number) ?? 0;
	        const toDegrees = (ctx.state.props.toDegrees as number) ?? 360;
	        const px = (ctx.state.props.pivotX as number) ?? ctx.elementCenter.x;
	        const py = (ctx.state.props.pivotY as number) ?? ctx.elementCenter.y;
	        const hasValues = (ctx.state.props.hasValues as boolean) ?? false;
	        const keyframes = ctx.state.props.keyframes as number[][] | undefined;
	        
			        if (hasValues) {
			          // Update keyframes preserving the original structure, updating pivot in all keyframes
			          const kfs = keyframes ?? [[fromDegrees, px, py], [toDegrees, px, py]];
			          const updatedKeyframes = kfs.map((kf) => [kf[0] ?? 0, px, py]);
			          ctx.updateState({ keyframes: updatedKeyframes });
			          ctx.updateAnimation({
			            values: formatValuesKeyframes(updatedKeyframes, ctx.precision),
			            from: undefined,
			            to: undefined,
			          });
		        } else {
		          ctx.updateAnimation({
		            from: formatTransformValue([fromDegrees, px, py], ctx.precision),
		            to: formatTransformValue([toDegrees, px, py], ctx.precision),
		            values: undefined,
		          });
		        }
		        ctx.commitChanges();
	      },
    },
    {
      id: 'arc',
      type: 'arc',
	      getPosition: (ctx) => {
	        const pivotX = (ctx.state.props.pivotX as number) ?? ctx.elementCenter.x;
	        const pivotY = (ctx.state.props.pivotY as number) ?? ctx.elementCenter.y;
	        const hasValues = (ctx.state.props.hasValues as boolean) ?? false;
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        const isMultiKeyframeValues = hasValues && keyframes.length > 2;
	        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);
	        const toDegrees = isMultiKeyframeValues
	          ? (keyframes[activeIndex]?.[0] ?? 0)
	          : ((ctx.state.props.toDegrees as number) ?? 0);
	        const radius = 60;
	        const angle = (toDegrees - 90) * (Math.PI / 180);
	        return {
	          x: pivotX + radius * Math.cos(angle),
	          y: pivotY + radius * Math.sin(angle),
	        };
	      },
	      label: (ctx) => {
	        const hasValues = (ctx.state.props.hasValues as boolean) ?? false;
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        const isMultiKeyframeValues = hasValues && keyframes.length > 2;
	        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);
	        const toDegrees = isMultiKeyframeValues
	          ? (keyframes[activeIndex]?.[0] ?? 0)
	          : ((ctx.state.props.toDegrees as number) ?? 0);
	        return `${formatTransformValue([toDegrees], ctx.precision)}°`;
	      },
      constraints: {
        axis: 'circular',
        snap: 1, // Will be 15 with shift
      },
	      onDrag: (_delta, ctx) => {
	        const pivotX = (ctx.state.props.pivotX as number) ?? ctx.elementCenter.x;
	        const pivotY = (ctx.state.props.pivotY as number) ?? ctx.elementCenter.y;
	        const hasValues = (ctx.state.props.hasValues as boolean) ?? false;
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        const isMultiKeyframeValues = hasValues && keyframes.length > 2;
	        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);

	        const prevAngle = Math.atan2(ctx.dragStart.y - pivotY, ctx.dragStart.x - pivotX);
	        const currentAngle = Math.atan2(ctx.currentPoint.y - pivotY, ctx.currentPoint.x - pivotX);

        let deltaDegrees = (currentAngle - prevAngle) * (180 / Math.PI);
        if (deltaDegrees > 180) deltaDegrees -= 360;
	        if (deltaDegrees < -180) deltaDegrees += 360;

	        const currentDegrees = isMultiKeyframeValues
	          ? (keyframes[activeIndex]?.[0] ?? 0)
	          : ((ctx.state.props.toDegrees as number) ?? 0);
	        let nextDegrees = currentDegrees + deltaDegrees;

	        if (ctx.modifiers.shift) {
	          nextDegrees = Math.round(nextDegrees / 15) * 15;
	        }

	        if (isMultiKeyframeValues) {
	          const px = (ctx.state.props.pivotX as number) ?? ctx.elementCenter.x;
	          const py = (ctx.state.props.pivotY as number) ?? ctx.elementCenter.y;
	          const updatedKeyframes = [...keyframes];
	          updatedKeyframes[activeIndex] = [roundNumber(nextDegrees, ctx.precision), px, py];

	          const first = updatedKeyframes[0] ?? [0];
	          const last = updatedKeyframes[updatedKeyframes.length - 1] ?? first;

	          ctx.updateState({
	            keyframes: updatedKeyframes,
	            fromDegrees: first[0] ?? 0,
	            toDegrees: last[0] ?? 0,
	          });
	          return;
	        }

	        ctx.updateState({ toDegrees: nextDegrees });
	      },
	      onDragEnd: (ctx) => {
	        const fromDegrees = (ctx.state.props.fromDegrees as number) ?? 0;
	        const toDegrees = (ctx.state.props.toDegrees as number) ?? 360;
	        const px = (ctx.state.props.pivotX as number) ?? ctx.elementCenter.x;
		        const py = (ctx.state.props.pivotY as number) ?? ctx.elementCenter.y;
		        const hasValues = (ctx.state.props.hasValues as boolean) ?? false;
		        const keyframes = ctx.state.props.keyframes as number[][] | undefined;
		        
			        if (hasValues) {
			          const kfs = keyframes ?? [[fromDegrees, px, py], [toDegrees, px, py]];
			          const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, kfs.length);
			          const degrees = kfs[activeIndex]?.[0] ?? 0;
			          const updatedKeyframes = [...kfs];
			          updatedKeyframes[activeIndex] = [roundNumber(degrees, ctx.precision), px, py];

			          const first = updatedKeyframes[0] ?? [0];
			          const last = updatedKeyframes[updatedKeyframes.length - 1] ?? first;
			          ctx.updateState({
			            keyframes: updatedKeyframes,
			            fromDegrees: first[0] ?? 0,
			            toDegrees: last[0] ?? 0,
			          });
			          ctx.updateAnimation({
			            values: formatValuesKeyframes(updatedKeyframes, ctx.precision),
			            from: undefined,
			            to: undefined,
			          });
			        } else {
		          ctx.updateAnimation({
		            from: formatTransformValue([fromDegrees, px, py], ctx.precision),
		            to: formatTransformValue([toDegrees, px, py], ctx.precision),
		            values: undefined,
		          });
		        }
		        ctx.commitChanges();
	      },
    },
  ],

	  visual: {
	    zIndex: 100,
	    render: (ctx: GizmoRenderContext) => {
	      const { elementCenter, state, colorMode } = ctx;
	      const pivotX = (state.props.pivotX as number) ?? elementCenter.x;
	      const pivotY = (state.props.pivotY as number) ?? elementCenter.y;
	      const fromDegrees = (state.props.fromDegrees as number) ?? 0;
	      const toDegrees = (state.props.toDegrees as number) ?? 360;
	      const hasValues = state.props.hasValues as boolean;
	      const keyframes = (state.props.keyframes as number[][]) ?? [];
	      const isMultiKeyframeValues = hasValues && keyframes.length > 2;

	      const strokeColor = colorMode === 'dark' ? '#68d391' : '#38a169';
	      const radius = 60;

	      // Calculate arc path
	      const startAngle = (fromDegrees - 90) * (Math.PI / 180);
	      const endAngle = (toDegrees - 90) * (Math.PI / 180);

      const startX = pivotX + radius * Math.cos(startAngle);
      const startY = pivotY + radius * Math.sin(startAngle);
      const endX = pivotX + radius * Math.cos(endAngle);
      const endY = pivotY + radius * Math.sin(endAngle);

	      const angleDiff = Math.abs(toDegrees - fromDegrees);
	      const largeArc = angleDiff > 180 ? 1 : 0;
	      const sweep = toDegrees > fromDegrees ? 1 : 0;

		      return (
		        <g className="rotate-gizmo" data-gizmo="rotate">
		          {/* Pivot crosshair */}
		          <g data-handle="pivot" style={{ cursor: 'move' }}>
            <circle
              cx={pivotX}
              cy={pivotY}
              r={8}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2}
            />
            <line
              x1={pivotX - 12}
              y1={pivotY}
              x2={pivotX + 12}
              y2={pivotY}
              stroke={strokeColor}
              strokeWidth={1.5}
            />
            <line
              x1={pivotX}
              y1={pivotY - 12}
              x2={pivotX}
              y2={pivotY + 12}
              stroke={strokeColor}
              strokeWidth={1.5}
            />
		          </g>

		          {/* Rotation arc / circle */}
		          {isMultiKeyframeValues ? (
		            <circle
		              cx={pivotX}
		              cy={pivotY}
		              r={radius}
		              fill="none"
		              stroke={strokeColor}
		              strokeWidth={2}
		              strokeDasharray="4 2"
		              style={{ pointerEvents: 'none' }}
		            />
		          ) : (
		            <path
		              d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`}
		              fill="none"
		              stroke={strokeColor}
		              strokeWidth={2}
		              strokeDasharray="4 2"
		              style={{ pointerEvents: 'none' }}
		            />
		          )}

		          {/* Angle handle is rendered as a gizmo handle */}
		        </g>
		      );
		    },
		  },

  fromAnimation: (animation: SVGAnimation, element: CanvasElement): GizmoState => {
    // Parse rotate value: "angle cx cy" format
    const parseRotate = (val: string | number | undefined) => {
      if (!val) return { degrees: 0, cx: undefined, cy: undefined };
      const parts = String(val).trim().split(/\s+/);
      return {
        degrees: parseFloat(parts[0]) || 0,
        cx: parts[1] ? parseFloat(parts[1]) : undefined,
        cy: parts[2] ? parseFloat(parts[2]) : undefined,
      };
    };

    // Check for values attribute first
    if (animation.values) {
      const keyframes = parseValuesKeyframes(animation.values);
      const fromKf = keyframes[0] ?? [0];
      const toKf = keyframes[keyframes.length - 1] ?? [360];
      
      return {
        gizmoId: 'rotate',
        animationId: animation.id,
        elementId: element.id,
	        props: {
	          fromDegrees: fromKf[0] ?? 0,
	          toDegrees: toKf[0] ?? 360,
	          pivotX: toKf[1] ?? fromKf[1],
	          pivotY: toKf[2] ?? fromKf[2],
	          hasValues: true,
	          keyframes,
	          ...(keyframes.length > 2 ? { activeKeyframeIndex: keyframes.length - 1 } : {}),
	        },
        interaction: {
          activeHandle: null,
          isDragging: false,
          dragStart: null,
          isHovered: false,
          hoveredHandle: null,
        },
      };
    }

    const from = parseRotate(animation.from);
    const to = parseRotate(animation.to);

    return {
      gizmoId: 'rotate',
      animationId: animation.id,
      elementId: element.id,
      props: {
        fromDegrees: from.degrees,
        toDegrees: to.degrees,
        pivotX: to.cx ?? from.cx,
        pivotY: to.cy ?? from.cy,
        hasValues: false,
        keyframes: [],
      },
      interaction: {
        activeHandle: null,
        isDragging: false,
        dragStart: null,
        isHovered: false,
        hoveredHandle: null,
      },
    };
  },

  toAnimation: (state: GizmoState): Partial<SVGAnimation> => {
    const { fromDegrees, toDegrees, pivotX, pivotY, hasValues, keyframes } = state.props;
    
    if (hasValues && keyframes) {
      const kfs = keyframes as number[][];
      const updatedKeyframes = [...kfs];
      // Update first and last keyframes with current values
      if (updatedKeyframes.length > 0) {
        updatedKeyframes[0] = [fromDegrees ?? 0, pivotX, pivotY].filter(v => v !== undefined) as number[];
        updatedKeyframes[updatedKeyframes.length - 1] = [toDegrees ?? 360, pivotX, pivotY].filter(v => v !== undefined) as number[];
      }
      return {
        type: 'animateTransform',
        transformType: 'rotate',
        values: formatValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    const from = pivotX !== undefined
      ? `${fromDegrees ?? 0} ${pivotX} ${pivotY}`
      : String(fromDegrees ?? 0);
    const to = pivotX !== undefined
      ? `${toDegrees ?? 360} ${pivotX} ${pivotY}`
      : String(toDegrees ?? 360);

    return {
      type: 'animateTransform',
      transformType: 'rotate',
      from,
      to,
      values: undefined,
    };
  },
};

// =============================================================================
// 03: Scale Gizmo
// =============================================================================

/**
 * Scale Gizmo
 * 
 * Visual: Ghost bounding box showing final size.
 * Interaction: Drag corners to define target scale.
 * SMIL Target: <animateTransform type="scale">
 */
const scaleGizmoDefinition: AnimationGizmoDefinition = {
  id: 'scale',
  category: 'transform',
  label: 'Scale',
  description: 'Scale element size',
  smilTarget: 'animateTransform',
  targetAttributes: ['transform'],

  appliesTo: (animation: SVGAnimation) => {
    return (
      animation.type === 'animateTransform' &&
      animation.transformType === 'scale'
    );
  },

  handles: [
	    {
	      id: 'corner-se',
	      type: 'scale',
	      position: (ctx) => {
	        const hasValues = ctx.state.props.hasValues as boolean;
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        const isMultiKeyframeValues = hasValues && keyframes.length > 2;
	        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);
	        const activeKf = keyframes[activeIndex] ?? [];
	        const activeScaleX = activeKf[0] ?? 1;
	        const activeScaleY = activeKf[1] ?? activeScaleX;
	        const scaleX = isMultiKeyframeValues ? activeScaleX : ((ctx.state.props.toScaleX as number) ?? 1);
	        const scaleY = isMultiKeyframeValues ? activeScaleY : ((ctx.state.props.toScaleY as number) ?? 1);
	        const bounds = ctx.elementBounds;
	        const width = bounds.maxX - bounds.minX;
	        const height = bounds.maxY - bounds.minY;
	        return {
	          x: ctx.elementCenter.x + (width / 2) * scaleX,
	          y: ctx.elementCenter.y + (height / 2) * scaleY,
	        };
	      },
	      cursor: 'nwse-resize',
	      onDrag: (delta, ctx) => {
	        const bounds = ctx.elementBounds;
	        const width = bounds.maxX - bounds.minX;
	        const height = bounds.maxY - bounds.minY;
	        const hasValues = ctx.state.props.hasValues as boolean;
	        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
	        const isMultiKeyframeValues = hasValues && keyframes.length > 2;
	        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);
	        const activeKf = keyframes[activeIndex] ?? [];
	        const activeScaleX = activeKf[0] ?? 1;
	        const activeScaleY = activeKf[1] ?? activeScaleX;
	        const currentScaleX = isMultiKeyframeValues ? activeScaleX : ((ctx.state.props.toScaleX as number) ?? 1);
	        const currentScaleY = isMultiKeyframeValues ? activeScaleY : ((ctx.state.props.toScaleY as number) ?? 1);

        const newScaleX = currentScaleX + (delta.x / (width / 2));
        const newScaleY = currentScaleY + (delta.y / (height / 2));

	        if (ctx.modifiers.shift) {
	          // Uniform scaling
	          const scale = Math.max(newScaleX, newScaleY);
	          if (isMultiKeyframeValues) {
	            const rounded = roundNumber(scale, ctx.precision);
	            const updatedKeyframes = [...keyframes];
	            updatedKeyframes[activeIndex] = [rounded, rounded];

	            const first = updatedKeyframes[0] ?? [1, 1];
	            const last = updatedKeyframes[updatedKeyframes.length - 1] ?? first;
	            ctx.updateState({
	              keyframes: updatedKeyframes,
	              fromScaleX: first[0] ?? 1,
	              fromScaleY: first[1] ?? first[0] ?? 1,
	              toScaleX: last[0] ?? 1,
	              toScaleY: last[1] ?? last[0] ?? 1,
	            });
	          } else {
	            ctx.updateState({ toScaleX: scale, toScaleY: scale });
	          }
	        } else {
	          if (isMultiKeyframeValues) {
	            const roundedX = roundNumber(newScaleX, ctx.precision);
	            const roundedY = roundNumber(newScaleY, ctx.precision);
	            const updatedKeyframes = [...keyframes];
	            updatedKeyframes[activeIndex] = [roundedX, roundedY];

	            const first = updatedKeyframes[0] ?? [1, 1];
	            const last = updatedKeyframes[updatedKeyframes.length - 1] ?? first;
	            ctx.updateState({
	              keyframes: updatedKeyframes,
	              fromScaleX: first[0] ?? 1,
	              fromScaleY: first[1] ?? first[0] ?? 1,
	              toScaleX: last[0] ?? 1,
	              toScaleY: last[1] ?? last[0] ?? 1,
	            });
	          } else {
	            ctx.updateState({ toScaleX: newScaleX, toScaleY: newScaleY });
	          }
	        }
	      },
	      onDragEnd: (ctx) => {
	        const { fromScaleX, fromScaleY, toScaleX, toScaleY, hasValues, keyframes } = ctx.state.props;
	        
		        if (hasValues) {
		          // Update keyframes preserving the original structure
		          const kfs = (keyframes as number[][]) ?? [[fromScaleX ?? 1, fromScaleY ?? 1], [toScaleX ?? 1, toScaleY ?? 1]];
		          const updatedKeyframes = [...kfs];
		          const isMultiKeyframeValues = updatedKeyframes.length > 2;
		          const activeIndex = isMultiKeyframeValues
		            ? clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, updatedKeyframes.length)
		            : Math.max(0, updatedKeyframes.length - 1);

		          if (isMultiKeyframeValues) {
		            const current = updatedKeyframes[activeIndex] ?? [];
		            const sx = current[0] ?? 1;
		            const sy = current[1] ?? sx;
		            updatedKeyframes[activeIndex] = [sx, sy];
		          } else {
		            updatedKeyframes[updatedKeyframes.length - 1] = [(toScaleX as number) ?? 1, (toScaleY as number) ?? 1];
		          }

		          ctx.updateState({ keyframes: updatedKeyframes });
		          ctx.updateAnimation({
		            values: formatValuesKeyframes(updatedKeyframes, ctx.precision),
		            from: undefined,
		            to: undefined,
		          });
		        } else {
	          ctx.updateAnimation({
	            from: formatTransformValue([(fromScaleX as number) ?? 1, (fromScaleY as number) ?? 1], ctx.precision),
	            to: formatTransformValue([(toScaleX as number) ?? 1, (toScaleY as number) ?? 1], ctx.precision),
	            values: undefined,
	          });
	        }
	        ctx.commitChanges();
      },
    },
  ],

  visual: {
	    zIndex: 100,
	    render: (ctx: GizmoRenderContext) => {
	      const { elementCenter, elementBounds, state, colorMode } = ctx;
	      const toScaleX = (state.props.toScaleX as number) ?? 1;
	      const toScaleY = (state.props.toScaleY as number) ?? 1;
	      const hasValues = state.props.hasValues as boolean;
	      const keyframes = (state.props.keyframes as number[][]) ?? [];
	      const isMultiKeyframeValues = hasValues && keyframes.length > 2;
	      const activeIndex = clampKeyframeIndex(state.props.activeKeyframeIndex, keyframes.length);
	      const activeKf = keyframes[activeIndex] ?? [];
	      const activeScaleX = activeKf[0] ?? toScaleX;
	      const activeScaleY = activeKf[1] ?? activeScaleX;
	      const displayScaleX = isMultiKeyframeValues ? activeScaleX : toScaleX;
	      const displayScaleY = isMultiKeyframeValues ? activeScaleY : toScaleY;

	      const width = elementBounds.maxX - elementBounds.minX;
	      const height = elementBounds.maxY - elementBounds.minY;

	      const strokeColor = colorMode === 'dark' ? '#f6ad55' : '#dd6b20';

	      // Target size box
	      const targetWidth = width * displayScaleX;
	      const targetHeight = height * displayScaleY;
	      const targetX = elementCenter.x - targetWidth / 2;
	      const targetY = elementCenter.y - targetHeight / 2;

	      return (
	        <g className="scale-gizmo" data-gizmo="scale">
	          {/* Target size ghost box */}
	          <rect
	            x={targetX}
	            y={targetY}
            width={targetWidth}
            height={targetHeight}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray="6 4"
          />

          {/* Corner handles */}
          {[
            { x: targetX + targetWidth, y: targetY + targetHeight, handle: 'corner-se', cursor: 'nwse-resize' },
            { x: targetX, y: targetY + targetHeight, handle: 'corner-sw', cursor: 'nesw-resize' },
            { x: targetX + targetWidth, y: targetY, handle: 'corner-ne', cursor: 'nesw-resize' },
            { x: targetX, y: targetY, handle: 'corner-nw', cursor: 'nwse-resize' },
          ].map(({ x, y, handle, cursor }) => (
            <rect
              key={handle}
              x={x - 5}
              y={y - 5}
              width={10}
              height={10}
              fill="white"
              stroke={strokeColor}
              strokeWidth={2}
              data-handle={handle}
              style={{ cursor }}
            />
          ))}

          {/* Scale label */}
	          <text
	            x={targetX + targetWidth + 10}
	            y={targetY - 5}
	            fontSize={11}
	            fill={strokeColor}
	          >
	            {isMultiKeyframeValues
	              ? `kf ${activeIndex + 1}/${keyframes.length} → ${displayScaleX.toFixed(2)}x${displayScaleY.toFixed(2)}`
	              : `${toScaleX.toFixed(2)}x${toScaleY.toFixed(2)}`}
	          </text>
	        </g>
	      );
	    },
	  },

  fromAnimation: (animation: SVGAnimation, element: CanvasElement): GizmoState => {
    // Check for values attribute first
    if (animation.values) {
      const keyframes = parseValuesKeyframes(animation.values);
      const fromKf = keyframes[0] ?? [1];
      const toKf = keyframes[keyframes.length - 1] ?? [1];
      
      return {
        gizmoId: 'scale',
        animationId: animation.id,
        elementId: element.id,
        props: {
          fromScaleX: fromKf[0] ?? 1,
          fromScaleY: fromKf[1] ?? fromKf[0] ?? 1,
          toScaleX: toKf[0] ?? 1,
          toScaleY: toKf[1] ?? toKf[0] ?? 1,
          hasValues: true,
          keyframes,
          ...(keyframes.length > 2 ? { activeKeyframeIndex: keyframes.length - 1 } : {}),
        },
        interaction: {
          activeHandle: null,
          isDragging: false,
          dragStart: null,
          isHovered: false,
          hoveredHandle: null,
        },
      };
    }
    
    const from = parseTransformValue(animation.from);
    const to = parseTransformValue(animation.to);

    return {
      gizmoId: 'scale',
      animationId: animation.id,
      elementId: element.id,
      props: {
        fromScaleX: from[0] ?? 1,
        fromScaleY: from[1] ?? from[0] ?? 1,
        toScaleX: to[0] ?? 1,
        toScaleY: to[1] ?? to[0] ?? 1,
        hasValues: false,
        keyframes: [],
      },
      interaction: {
        activeHandle: null,
        isDragging: false,
        dragStart: null,
        isHovered: false,
        hoveredHandle: null,
      },
    };
  },

  toAnimation: (state: GizmoState): Partial<SVGAnimation> => {
    const { fromScaleX, fromScaleY, toScaleX, toScaleY, hasValues, keyframes } = state.props;
    
    if (hasValues && keyframes) {
      const kfs = keyframes as number[][];
      const updatedKeyframes = [...kfs];
      // Update first and last keyframes with current values
      if (updatedKeyframes.length > 0) {
        updatedKeyframes[0] = [(fromScaleX as number) ?? 1, (fromScaleY as number) ?? 1];
        updatedKeyframes[updatedKeyframes.length - 1] = [(toScaleX as number) ?? 1, (toScaleY as number) ?? 1];
      }
      return {
        type: 'animateTransform',
        transformType: 'scale',
        values: formatValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }
    
    return {
      type: 'animateTransform',
      transformType: 'scale',
      from: formatTransformValue([(fromScaleX as number) ?? 1, (fromScaleY as number) ?? 1]),
      to: formatTransformValue([(toScaleX as number) ?? 1, (toScaleY as number) ?? 1]),
      values: undefined,
    };
  },
};

// =============================================================================
// 04: Skew Gizmo
// =============================================================================

/**
 * Skew (Inclinación) Gizmo
 * 
 * Visual: Parallelogram showing skewed bounding box.
 * Interaction: Drag edge midpoints to skew horizontally/vertically.
 * SMIL Target: <animateTransform type="skewX/Y">
 */
const skewGizmoDefinition: AnimationGizmoDefinition = {
  id: 'skew',
  category: 'transform',
  label: 'Skew',
  description: 'Skew element horizontally or vertically',
  smilTarget: 'animateTransform',
  targetAttributes: ['transform'],

  appliesTo: (animation: SVGAnimation) => {
    return (
      animation.type === 'animateTransform' &&
      (animation.transformType === 'skewX' || animation.transformType === 'skewY')
    );
  },

  handles: [
    {
      id: 'skew-horizontal',
      type: 'slider',
      position: (ctx) => {
        const toSkewX = (ctx.state.props.toSkewX as number) ?? 0;
        const hasValues = (ctx.state.props.hasValues as boolean) ?? false;
        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
        const activeAxis = (ctx.state.props.activeAxis as 'x' | 'y') ?? 'x';
        const isMultiKeyframeValues = hasValues && keyframes.length > 2;
        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);
        const activeValue = keyframes[activeIndex]?.[0] ?? 0;
        const displaySkewX = isMultiKeyframeValues && activeAxis === 'x' ? activeValue : toSkewX;

        return {
          x: ctx.elementCenter.x + displaySkewX,
          y: ctx.elementBounds.minY - 20,
        };
      },
      cursor: 'ew-resize',
      constraints: {
        axis: 'x',
      },
      onDrag: (delta, ctx) => {
        const hasValues = (ctx.state.props.hasValues as boolean) ?? false;
        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
        const fromSkewX = (ctx.state.props.fromSkewX as number) ?? 0;
        const toSkewX = (ctx.state.props.toSkewX as number) ?? 0;

        if (hasValues) {
          const kfs = keyframes.length > 0 ? keyframes : [[fromSkewX], [toSkewX]];
          const updatedKeyframes = [...kfs];
          const isMultiKeyframeValues = updatedKeyframes.length > 2;
          const activeIndex = isMultiKeyframeValues
            ? clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, updatedKeyframes.length)
            : Math.max(0, updatedKeyframes.length - 1);

          const current = updatedKeyframes[activeIndex]?.[0] ?? 0;
          const next = roundNumber(current + delta.x, ctx.precision);
          updatedKeyframes[activeIndex] = [next];

          const first = updatedKeyframes[0]?.[0] ?? 0;
          const last = updatedKeyframes[updatedKeyframes.length - 1]?.[0] ?? first;

          ctx.updateState({
            activeAxis: 'x',
            keyframes: updatedKeyframes,
            fromSkewX: first,
            toSkewX: last,
            fromSkewY: 0,
            toSkewY: 0,
          });
          return;
        }

        const current = (ctx.state.props.toSkewX as number) ?? 0;
        ctx.updateState({ activeAxis: 'x', toSkewX: roundNumber(current + delta.x, ctx.precision) });
      },
      onDragEnd: (ctx) => {
        const { fromSkewX, toSkewX, hasValues, keyframes } = ctx.state.props;
        
	        if (hasValues) {
	          // Update keyframes preserving the original structure
	          const kfs = (keyframes as number[][]) ?? [[fromSkewX ?? 0], [toSkewX ?? 0]];
	          const updatedKeyframes = [...kfs];
	          ctx.updateState({ activeAxis: 'x', keyframes: updatedKeyframes });
	          ctx.updateAnimation({
	            transformType: 'skewX',
	            values: formatValuesKeyframes(updatedKeyframes, ctx.precision),
	            from: undefined,
	            to: undefined,
	          });
	        } else {
	          ctx.updateAnimation({
	            transformType: 'skewX',
	            from: formatTransformValue([(fromSkewX as number) ?? 0], ctx.precision),
	            to: formatTransformValue([(toSkewX as number) ?? 0], ctx.precision),
	            values: undefined,
	          });
	        }
	        ctx.commitChanges();
      },
    },
    {
      id: 'skew-vertical',
      type: 'slider',
      position: (ctx) => {
        const toSkewY = (ctx.state.props.toSkewY as number) ?? 0;
        const hasValues = (ctx.state.props.hasValues as boolean) ?? false;
        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
        const activeAxis = (ctx.state.props.activeAxis as 'x' | 'y') ?? 'x';
        const isMultiKeyframeValues = hasValues && keyframes.length > 2;
        const activeIndex = clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, keyframes.length);
        const activeValue = keyframes[activeIndex]?.[0] ?? 0;
        const displaySkewY = isMultiKeyframeValues && activeAxis === 'y' ? activeValue : toSkewY;

        return {
          x: ctx.elementBounds.maxX + 20,
          y: ctx.elementCenter.y + displaySkewY,
        };
      },
      cursor: 'ns-resize',
      constraints: {
        axis: 'y',
      },
      onDrag: (delta, ctx) => {
        const hasValues = (ctx.state.props.hasValues as boolean) ?? false;
        const keyframes = (ctx.state.props.keyframes as number[][]) ?? [];
        const fromSkewY = (ctx.state.props.fromSkewY as number) ?? 0;
        const toSkewY = (ctx.state.props.toSkewY as number) ?? 0;

        if (hasValues) {
          const kfs = keyframes.length > 0 ? keyframes : [[fromSkewY], [toSkewY]];
          const updatedKeyframes = [...kfs];
          const isMultiKeyframeValues = updatedKeyframes.length > 2;
          const activeIndex = isMultiKeyframeValues
            ? clampKeyframeIndex(ctx.state.props.activeKeyframeIndex, updatedKeyframes.length)
            : Math.max(0, updatedKeyframes.length - 1);

          const current = updatedKeyframes[activeIndex]?.[0] ?? 0;
          const next = roundNumber(current + delta.y, ctx.precision);
          updatedKeyframes[activeIndex] = [next];

          const first = updatedKeyframes[0]?.[0] ?? 0;
          const last = updatedKeyframes[updatedKeyframes.length - 1]?.[0] ?? first;

          ctx.updateState({
            activeAxis: 'y',
            keyframes: updatedKeyframes,
            fromSkewY: first,
            toSkewY: last,
            fromSkewX: 0,
            toSkewX: 0,
          });
          return;
        }

        const current = (ctx.state.props.toSkewY as number) ?? 0;
        ctx.updateState({ activeAxis: 'y', toSkewY: roundNumber(current + delta.y, ctx.precision) });
      },
      onDragEnd: (ctx) => {
        const { fromSkewY, toSkewY, hasValues, keyframes } = ctx.state.props;
        
	        if (hasValues) {
	          // Update keyframes preserving the original structure
	          const kfs = (keyframes as number[][]) ?? [[fromSkewY ?? 0], [toSkewY ?? 0]];
	          const updatedKeyframes = [...kfs];
	          ctx.updateState({ activeAxis: 'y', keyframes: updatedKeyframes });
	          ctx.updateAnimation({
	            transformType: 'skewY',
	            values: formatValuesKeyframes(updatedKeyframes, ctx.precision),
	            from: undefined,
	            to: undefined,
	          });
	        } else {
	          ctx.updateAnimation({
	            transformType: 'skewY',
	            from: formatTransformValue([(fromSkewY as number) ?? 0], ctx.precision),
	            to: formatTransformValue([(toSkewY as number) ?? 0], ctx.precision),
	            values: undefined,
	          });
	        }
	        ctx.commitChanges();
      },
    },
  ],

  visual: {
    zIndex: 100,
    render: (ctx: GizmoRenderContext) => {
      const { elementCenter, elementBounds, state, colorMode } = ctx;
      const toSkewX = (state.props.toSkewX as number) ?? 0;
      const toSkewY = (state.props.toSkewY as number) ?? 0;
      const hasValues = state.props.hasValues as boolean;
      const keyframes = (state.props.keyframes as number[][]) ?? [];
      const activeAxis = (state.props.activeAxis as 'x' | 'y') ?? 'x';
      const isMultiKeyframeValues = hasValues && keyframes.length > 2;
      const activeIndex = clampKeyframeIndex(state.props.activeKeyframeIndex, keyframes.length);
      const activeKf = keyframes[activeIndex] ?? [];
      const activeValue = activeKf[0] ?? 0;
      const displaySkewX = isMultiKeyframeValues ? (activeAxis === 'x' ? activeValue : 0) : toSkewX;
      const displaySkewY = isMultiKeyframeValues ? (activeAxis === 'y' ? activeValue : 0) : toSkewY;

      const strokeColor = colorMode === 'dark' ? '#b794f4' : '#805ad5';
      const intermediateColor = colorMode === 'dark' ? '#D6BCFA' : '#6B46C1';

      // Calculate skewed parallelogram corners
      const w = (elementBounds.maxX - elementBounds.minX) / 2;
      const h = (elementBounds.maxY - elementBounds.minY) / 2;

      // Apply skew transformation
      const skewXRad = (displaySkewX * Math.PI) / 180;
      const skewYRad = (displaySkewY * Math.PI) / 180;

      const corners = [
        { x: -w, y: -h },
        { x: w, y: -h },
        { x: w, y: h },
        { x: -w, y: h },
      ].map(({ x, y }) => ({
        x: elementCenter.x + x + y * Math.tan(skewXRad),
        y: elementCenter.y + y + x * Math.tan(skewYRad),
      }));

      const pathD = `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`;
      
      return (
        <g className="skew-gizmo" data-gizmo="skew">
          {/* Skewed bounding box */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray="6 4"
          />

          {/* Horizontal skew handle */}
          <g data-handle="skew-horizontal" style={{ cursor: 'ew-resize' }}>
            <rect
              x={elementCenter.x + displaySkewX - 15}
              y={elementBounds.minY - 28}
              width={30}
              height={16}
              fill="white"
              stroke={strokeColor}
              strokeWidth={2}
              rx={4}
            />
            <text
              x={elementCenter.x + displaySkewX}
              y={elementBounds.minY - 16}
              fontSize={10}
              fill={strokeColor}
              textAnchor="middle"
            >
              {Math.round(displaySkewX)}°X
            </text>
          </g>
          
          {isMultiKeyframeValues && activeAxis === 'x' && (
            <text
              x={elementCenter.x + displaySkewX}
              y={elementBounds.minY - 36}
              fontSize={8}
              fill={intermediateColor}
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              kf {activeIndex + 1}/{keyframes.length}
            </text>
          )}

          {/* Vertical skew handle */}
          <g data-handle="skew-vertical" style={{ cursor: 'ns-resize' }}>
            <rect
              x={elementBounds.maxX + 12}
              y={elementCenter.y + displaySkewY - 8}
              width={30}
              height={16}
              fill="white"
              stroke={strokeColor}
              strokeWidth={2}
              rx={4}
            />
            <text
              x={elementBounds.maxX + 27}
              y={elementCenter.y + displaySkewY + 4}
              fontSize={10}
              fill={strokeColor}
              textAnchor="middle"
            >
              {Math.round(displaySkewY)}°Y
            </text>
          </g>
          
          {isMultiKeyframeValues && activeAxis === 'y' && (
            <text
              x={elementBounds.maxX + 27}
              y={elementCenter.y + displaySkewY - 16}
              fontSize={8}
              fill={intermediateColor}
              textAnchor="middle"
              style={{ pointerEvents: 'none' }}
            >
              kf {activeIndex + 1}/{keyframes.length}
            </text>
          )}
        </g>
      );
    },
  },

  fromAnimation: (animation: SVGAnimation, element: CanvasElement): GizmoState => {
    const isSkewX = animation.transformType === 'skewX';
    
    // Check for values attribute first
    if (animation.values) {
      const keyframes = parseValuesKeyframes(animation.values);
      const fromKf = keyframes[0] ?? [0];
      const toKf = keyframes[keyframes.length - 1] ?? [0];
      
      return {
        gizmoId: 'skew',
        animationId: animation.id,
        elementId: element.id,
        props: {
          fromSkewX: isSkewX ? (fromKf[0] ?? 0) : 0,
          fromSkewY: isSkewX ? 0 : (fromKf[0] ?? 0),
          toSkewX: isSkewX ? (toKf[0] ?? 0) : 0,
          toSkewY: isSkewX ? 0 : (toKf[0] ?? 0),
          activeAxis: isSkewX ? 'x' : 'y',
          hasValues: true,
          keyframes,
          ...(keyframes.length > 2 ? { activeKeyframeIndex: keyframes.length - 1 } : {}),
        },
        interaction: {
          activeHandle: null,
          isDragging: false,
          dragStart: null,
          isHovered: false,
          hoveredHandle: null,
        },
      };
    }
    
    const from = parseFloat(String(animation.from ?? 0));
    const to = parseFloat(String(animation.to ?? 0));

    return {
      gizmoId: 'skew',
      animationId: animation.id,
      elementId: element.id,
      props: {
        fromSkewX: isSkewX ? from : 0,
        fromSkewY: isSkewX ? 0 : from,
        toSkewX: isSkewX ? to : 0,
        toSkewY: isSkewX ? 0 : to,
        activeAxis: isSkewX ? 'x' : 'y',
        hasValues: false,
        keyframes: [],
      },
      interaction: {
        activeHandle: null,
        isDragging: false,
        dragStart: null,
        isHovered: false,
        hoveredHandle: null,
      },
    };
  },

  toAnimation: (state: GizmoState): Partial<SVGAnimation> => {
    const { fromSkewX, fromSkewY, toSkewX, toSkewY, activeAxis, hasValues, keyframes } = state.props;
    const isSkewX = activeAxis === 'x' || (toSkewX !== 0 && toSkewY === 0);

    if (hasValues && keyframes) {
      const kfs = keyframes as number[][];
      const updatedKeyframes = [...kfs];
      // Update first and last keyframes with current values
      if (updatedKeyframes.length > 0) {
        updatedKeyframes[0] = [isSkewX ? (fromSkewX as number) ?? 0 : (fromSkewY as number) ?? 0];
        updatedKeyframes[updatedKeyframes.length - 1] = [isSkewX ? (toSkewX as number) ?? 0 : (toSkewY as number) ?? 0];
      }
      return {
        type: 'animateTransform',
        transformType: isSkewX ? 'skewX' : 'skewY',
        values: formatValuesKeyframes(updatedKeyframes),
        from: undefined,
        to: undefined,
      };
    }

    return {
      type: 'animateTransform',
      transformType: isSkewX ? 'skewX' : 'skewY',
      from: String(isSkewX ? (fromSkewX ?? 0) : (fromSkewY ?? 0)),
      to: String(isSkewX ? (toSkewX ?? 0) : (toSkewY ?? 0)),
      values: undefined,
    };
  },
};

// =============================================================================
// Export all transform gizmos
// =============================================================================

export const transformGizmos: AnimationGizmoDefinition[] = [
  translateGizmoDefinition,
  rotateGizmoDefinition,
  scaleGizmoDefinition,
  skewGizmoDefinition,
];
