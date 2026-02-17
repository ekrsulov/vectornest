import type { AnimationChainEntry, AnimationSliceCreator, SVGAnimation } from './types';
import type { TransformDeltaEntry } from '../../utils/animationTransformDelta';
import type { Matrix } from '../../utils/matrixUtils';
import { applyToPoint, IDENTITY_MATRIX, inverseMatrix, multiplyMatrices } from '../../utils/matrixUtils';
import { parsePath, absolutize, normalize, serialize } from 'path-data-parser';

const generateAnimationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `anim-${crypto.randomUUID()}`;
  }
  return `anim-${Math.random().toString(36).slice(2, 10)}`;
};

const withDefaults = (animation: SVGAnimation): SVGAnimation => {
  return {
    fill: 'freeze',
    repeatCount: animation.repeatCount ?? 1,
    dur: animation.dur ?? '2s',
    ...animation,
  };
};

const computeTotalDurationSeconds = (animation?: SVGAnimation): number => {
  if (!animation) return 0;
  const durSec = parseFloat(String(animation.dur ?? '0').replace('s', '')) || 0;
  const repeatDur = animation.repeatDur ? parseFloat(String(animation.repeatDur).replace('s', '')) : null;
  const repeat = animation.repeatCount === 'indefinite'
    ? Infinity
    : typeof animation.repeatCount === 'number'
      ? animation.repeatCount
      : 1;
  if (repeatDur && repeatDur > 0) return repeatDur;
  if (repeat === Infinity) return Infinity;
  return durSec * repeat;
};

const ROUND_PRECISION = 3;
const round = (value: number): number => parseFloat(value.toFixed(ROUND_PRECISION));

const isIdentity = (matrix: Matrix): boolean => {
  const epsilon = 1e-6;
  return (
    Math.abs(matrix[0] - IDENTITY_MATRIX[0]) < epsilon &&
    Math.abs(matrix[1] - IDENTITY_MATRIX[1]) < epsilon &&
    Math.abs(matrix[2] - IDENTITY_MATRIX[2]) < epsilon &&
    Math.abs(matrix[3] - IDENTITY_MATRIX[3]) < epsilon &&
    Math.abs(matrix[4] - IDENTITY_MATRIX[4]) < epsilon &&
    Math.abs(matrix[5] - IDENTITY_MATRIX[5]) < epsilon
  );
};

const formatNumbers = (values: number[]): string => values.map((v) => round(v)).join(' ');

const adjustTransformSegment = (
  segment: string,
  transformType: SVGAnimation['transformType'],
  delta: Matrix
): string => {
  const numbers = segment.trim().split(/[\s,]+/).filter(Boolean).map(parseFloat);
  if (numbers.some((n) => Number.isNaN(n))) return segment;

  if (transformType === 'rotate') {
    if (numbers.length < 3) {
      // Rotate about implicit (0,0) – shift center by delta translation
      const impliedCenter = applyToPoint(delta, { x: 0, y: 0 });
      const next = [numbers[0], round(impliedCenter.x), round(impliedCenter.y)];
      return formatNumbers(next);
    }
    const center = applyToPoint(delta, { x: numbers[1], y: numbers[2] });
    const next = [...numbers];
    next[1] = round(center.x);
    next[2] = round(center.y);
    return formatNumbers(next);
  }

  if (transformType === 'translate') {
    // Translate animations are relative offsets; base geometry already moved, so keep values.
    return segment;
  }

  return segment;
};

const adjustTransformValue = (
  value: string | number | undefined,
  transformType: SVGAnimation['transformType'],
  delta: Matrix
): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) {
    return value === undefined ? undefined : String(value);
  }

  const segments = value.split(';').map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) return value;

  const adjusted = segments.map((segment) => adjustTransformSegment(segment, transformType, delta));
  const nextValue = adjusted.join(';');
  return nextValue === value ? value : nextValue;
};

const transformPathString = (path: string, delta: Matrix): string => {
  try {
    const segments = normalize(absolutize(parsePath(path)));
    const transformed = segments.map((segment) => {
      const data = [...segment.data];
      for (let i = 0; i < data.length; i += 2) {
        const x = data[i];
        const y = data[i + 1] ?? 0;
        const pt = applyToPoint(delta, { x, y });
        data[i] = round(pt.x);
        if (i + 1 < data.length) {
          data[i + 1] = round(pt.y);
        }
      }
      return { ...segment, data };
    });
    return serialize(transformed);
  } catch (_error) {
    return path;
  }
};

const applyDeltaToAnimation = (animation: SVGAnimation, delta: Matrix): SVGAnimation => {
  if (animation.type === 'animateTransform' && animation.transformType) {
    const { transformType } = animation;
    const nextValues = adjustTransformValue(animation.values, transformType, delta);
    const nextFrom = adjustTransformValue(animation.from, transformType, delta);
    const nextTo = adjustTransformValue(animation.to, transformType, delta);

    if (nextValues === animation.values && nextFrom === animation.from && nextTo === animation.to) {
      return animation;
    }

    return { ...animation, values: nextValues, from: nextFrom, to: nextTo };
  }

  if (animation.type === 'animateMotion' && animation.path) {
    const nextPath = transformPathString(animation.path, delta);
    if (nextPath !== animation.path) {
      return { ...animation, path: nextPath };
    }
  }

  if (animation.type === 'animate' && animation.attributeName) {
    return applyDeltaToAttributeAnimation(animation, delta);
  }

  return animation;
};

const extractTranslation = (matrix: Matrix): { x: number; y: number } => ({
  x: round(matrix[4]),
  y: round(matrix[5]),
});

const X_ATTRIBUTES = new Set(['x', 'x1', 'x2', 'cx']);
const Y_ATTRIBUTES = new Set(['y', 'y1', 'y2', 'cy']);

const adjustNumericValue = (
  value: string | number | undefined,
  delta: { x: number; y: number },
  axis: 'x' | 'y'
): string | undefined => {
  if (value === undefined) return undefined;
  const valueStr = typeof value === 'string' ? value : String(value);
  if (!valueStr.trim()) return valueStr;

  const segments = valueStr.split(';').map((segment) => segment.trim()).filter(Boolean);
  if (segments.length === 0) return valueStr;

  const adjusted = segments.map((segment) => {
    const numbers = segment.split(/[\s,]+/).filter(Boolean).map(parseFloat);
    if (numbers.some((n) => Number.isNaN(n))) return segment;
    const shift = axis === 'x' ? delta.x : delta.y;
    const nextNumbers = numbers.map((n) => round(n + shift));
    return formatNumbers(nextNumbers);
  });

  const nextValue = adjusted.join('; ');
  return nextValue === valueStr ? valueStr : nextValue;
};

const applyDeltaToAttributeAnimation = (animation: SVGAnimation, delta: Matrix): SVGAnimation => {
  const translation = extractTranslation(delta);
  if (translation.x === 0 && translation.y === 0) {
    return animation;
  }

  if (!animation.attributeName) {
    return animation;
  }

  const isX = X_ATTRIBUTES.has(animation.attributeName);
  const isY = Y_ATTRIBUTES.has(animation.attributeName);
  if (!isX && !isY) {
    return animation;
  }

  const axis: 'x' | 'y' = isX ? 'x' : 'y';

  const nextValues = adjustNumericValue(animation.values, translation, axis);
  const nextFrom = adjustNumericValue(animation.from, translation, axis);
  const nextTo = adjustNumericValue(animation.to, translation, axis);

  if (nextValues === animation.values && nextFrom === animation.from && nextTo === animation.to) {
    return animation;
  }

  return { ...animation, values: nextValues, from: nextFrom, to: nextTo };
};

const isSupportedElement = (
  targetId: string,
  kinds?: Array<{ type: string; kind?: string }>
): boolean => {
  const elements = (getCache() as { elements?: Array<{ id: string; type: string; data?: { kind?: string } }> }).elements ?? [];
  const el = elements.find((e) => e.id === targetId);
  if (!el) {
    console.warn(`Element ${targetId} not found for animation`);
    return false;
  }
  if (!kinds || kinds.length === 0) return true;
  return kinds.some((k) => {
    if (k.kind) {
      return el.type === k.type && (el.data as { kind?: string } | undefined)?.kind === k.kind;
    }
    return el.type === k.type;
  });
};

// Helper to access current store inside utility functions
let getCache: () => { elements?: Array<{ id: string; type: string; data?: { kind?: string } }> };

export const createAnimationSlice: AnimationSliceCreator = (set, get) => {
  getCache = get as unknown as typeof getCache;
  return {
    animations: [],
    animationState: {
      isPlaying: false,
      hasPlayed: false,
      currentTime: 0,
      startTime: null,
      playbackRate: 1,
      restartKey: 0,
      chainDelays: new Map(),
      isWorkspaceOpen: false,
      isCanvasPreviewMode: false,
    },
    animationSync: {
      chains: [],
      events: [],
    },
    timelineLabelWidth: 170,
    applyAnimationTransformDelta: (deltas: TransformDeltaEntry[]) => {
      if (!deltas || deltas.length === 0) return;

      const deltaMap = new Map<string, Matrix>();
      deltas.forEach(({ elementId, from, to }) => {
        const inverse = inverseMatrix(from);
        if (!inverse) return;
        const deltaMatrix = multiplyMatrices(to, inverse);
        if (!isIdentity(deltaMatrix)) {
          deltaMap.set(elementId, deltaMatrix);
        }
      });

      if (deltaMap.size === 0) return;

      set((state) => {
        if (!state.animations || state.animations.length === 0) return state;
        let didChange = false;
        const updated = state.animations.map((animation) => {
          const delta = deltaMap.get(animation.targetElementId);
          if (!delta) return animation;
          const nextAnimation = applyDeltaToAnimation(animation, delta);
          if (nextAnimation !== animation) {
            didChange = true;
          }
          return nextAnimation;
        });

        // Avoid churn when no animations were actually affected by the moved elements.
        if (!didChange) return state;

        return { animations: updated };
      });
    },

    addAnimation: (animation) => {
      const id = animation.id ?? generateAnimationId();
      const next = withDefaults({ ...animation, id, targetElementId: animation.targetElementId });
      set((state) => ({
        animations: [...state.animations, next],
      }));
    },

    updateAnimation: (id, updates) => {
      set((state) => ({
        animations: state.animations.map((anim) =>
          anim.id === id ? withDefaults({ ...anim, ...updates }) : anim
        ),
      }));
    },

    removeAnimation: (id) => {
      set((state) => ({
        animations: state.animations.filter((anim) => anim.id !== id),
      }));
    },

    clearAnimations: () => {
      set(() => ({
        animations: [],
      }));
    },

    createFadeAnimation: (targetId, dur = '2s', from = 1, to = 0) => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'opacity',
        targetElementId: targetId,
        dur,
        from: String(from),
        to: String(to),
        repeatCount: 1,
      };
      get().addAnimation(animation);
    },

    createRotateAnimation: (targetId, dur = '2s', degrees: string | number = '360') => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animateTransform',
        attributeName: 'transform',
        transformType: 'rotate',
        targetElementId: targetId,
        dur,
        from: '0',
        to: String(degrees),
        repeatCount: 1,
        additive: 'sum',
      };
      get().addAnimation(animation);
    },

    createMoveAnimation: (targetId, dur = '2s', fromX = 0, fromY = 0, toX = 50, toY = 0) => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animateTransform',
        attributeName: 'transform',
        transformType: 'translate',
        targetElementId: targetId,
        dur,
        from: `${fromX} ${fromY}`,
        to: `${toX} ${toY}`,
        repeatCount: 1,
        additive: 'sum',
      };
      get().addAnimation(animation);
    },

    createScaleAnimation: (targetId, dur = '2s', fromScale = 1, toScale = 1.2) => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animateTransform',
        attributeName: 'transform',
        transformType: 'scale',
        targetElementId: targetId,
        dur,
        from: `${fromScale} ${fromScale}`,
        to: `${toScale} ${toScale}`,
        repeatCount: 1,
        additive: 'replace',
      };
      get().addAnimation(animation);
    },

    createPathDrawAnimation: (targetId, dur = '2s') => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'stroke-dashoffset',
        targetElementId: targetId,
        dur,
        from: '1',
        to: '0',
        repeatCount: 1,
        fill: 'freeze',
      };
      get().addAnimation(animation);
    },

    createSetAnimation: (targetId, attributeName, to, begin = '0s', end) => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'set',
        attributeName,
        targetElementId: targetId,
        to: String(to),
        begin,
        end,
        fill: 'freeze',
      };
      get().addAnimation(animation);
    },

    createAttributeAnimation: (targetId, attributeName, dur = '2s', from = '0', to = '1', repeatCount: number | 'indefinite' = 1) => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName,
        targetElementId: targetId,
        dur,
        from: String(from),
        to: String(to),
        repeatCount,
      };
      get().addAnimation(animation);
    },

    createFillColorAnimation: (targetId, dur = '2s') => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'fill',
        targetElementId: targetId,
        dur,
        values: '#ff6b6b;#4ecdc4;#ff6b6b',
        repeatCount: 'indefinite',
        calcMode: 'linear',
      };
      get().addAnimation(animation);
    },

    createStrokeColorAnimation: (targetId, dur = '2s') => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'stroke',
        targetElementId: targetId,
        dur,
        values: '#111111;#ff9900;#111111',
        repeatCount: 'indefinite',
        calcMode: 'linear',
      };
      get().addAnimation(animation);
    },

    createStrokeWidthAnimation: (targetId, dur = '2s', fromWidth = 1, toWidth = 4) => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'stroke-width',
        targetElementId: targetId,
        dur,
        from: String(fromWidth),
        to: String(toWidth),
        repeatCount: 1,
        fill: 'freeze',
      };
      get().addAnimation(animation);
    },

    createPositionAnimation: (targetId, dur = '2s', fromX = 0, fromY = 0, toX = 40, toY = 40) => {
      const xAnim: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'x',
        targetElementId: targetId,
        dur,
        from: String(fromX),
        to: String(toX),
        repeatCount: 1,
        fill: 'freeze',
      };
      const yAnim: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'y',
        targetElementId: targetId,
        dur,
        from: String(fromY),
        to: String(toY),
        repeatCount: 1,
        fill: 'freeze',
      };
      get().addAnimation(xAnim);
      get().addAnimation(yAnim);
    },

    createSizeAnimation: (targetId, dur = '2s', fromWidth = 20, fromHeight = 20, toWidth = 60, toHeight = 60) => {
      const wAnim: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'width',
        targetElementId: targetId,
        dur,
        from: String(fromWidth),
        to: String(toWidth),
        repeatCount: 1,
        fill: 'freeze',
      };
      const hAnim: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'height',
        targetElementId: targetId,
        dur,
        from: String(fromHeight),
        to: String(toHeight),
        repeatCount: 1,
        fill: 'freeze',
      };
      get().addAnimation(wAnim);
      get().addAnimation(hAnim);
    },

    createFontSizeAnimation: (targetId, dur = '2s', fromSize = 16, toSize = 28) => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'font-size',
        targetElementId: targetId,
        dur,
        from: String(fromSize),
        to: String(toSize),
        repeatCount: 1,
        fill: 'freeze',
      };
      get().addAnimation(animation);
    },

    createFontWeightAnimation: (targetId, dur = '2s', fromWeight = '400', toWeight = '700') => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'font-weight',
        targetElementId: targetId,
        dur,
        from: fromWeight,
        to: toWeight,
        repeatCount: 1,
        fill: 'freeze',
      };
      get().addAnimation(animation);
    },

    createLetterSpacingAnimation: (targetId, dur = '2s', from = 0, to = 4) => {
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'letter-spacing',
        targetElementId: targetId,
        dur,
        from: String(from),
        to: String(to),
        repeatCount: 1,
        fill: 'freeze',
      };
      get().addAnimation(animation);
    },

    createCircleAnimation: (targetId, dur = '2s', fromRadius = 10, toRadius = 50) => {
      const element = (get() as { elements?: Array<{ id: string; type: string; data?: { kind?: string } }> }).elements?.find?.((el) => el.id === targetId);
      if (!element || element.type !== 'nativeShape' || element.data?.kind !== 'circle') {
        console.warn('Circle animation requires a nativeShape of kind circle');
        return;
      }
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'r',
        targetElementId: targetId,
        dur,
        from: String(fromRadius),
        to: String(toRadius),
        repeatCount: 1,
        fill: 'freeze',
      };
      get().addAnimation(animation);
    },

    createLineAnimation: (
      targetId,
      dur = '2s',
      fromCoords = { x1: 0, y1: 0, x2: 50, y2: 50 },
      toCoords = { x1: 100, y1: 100, x2: 150, y2: 150 }
    ) => {
      const element = (get() as { elements?: Array<{ id: string; type: string; data?: { kind?: string } }> }).elements?.find?.((el) => el.id === targetId);
      if (!element || element.type !== 'nativeShape' || element.data?.kind !== 'line') {
        console.warn('Line animation requires a nativeShape of kind line');
        return;
      }
      const addAnimation = get().addAnimation;
      (['x1', 'y1', 'x2', 'y2'] as const).forEach((attr) => {
        addAnimation?.({
          id: generateAnimationId(),
          type: 'animate',
          attributeName: attr,
          targetElementId: targetId,
          dur,
          from: String(fromCoords[attr]),
          to: String(toCoords[attr]),
          repeatCount: 1,
          fill: 'freeze',
        });
      });
    },

    createPathDataAnimation: (targetId, dur = '2s', fromD = 'M0 0 L100 0', toD = 'M0 0 L100 100') => {
      const element = (get() as { elements?: Array<{ id: string; type: string }> }).elements?.find?.((el) => el.id === targetId);
      if (!element || element.type !== 'path') {
        console.warn('Path data animation requires a path element');
        return;
      }
      const animation: SVGAnimation = {
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'd',
        targetElementId: targetId,
        dur,
        from: fromD,
        to: toD,
        repeatCount: 1,
        fill: 'freeze',
      };
      get().addAnimation(animation);
    },

    createTextPositionAnimation: (targetId, dur = '2s', fromX = 0, fromY = 0, toX = 50, toY = 50) => {
      const element = (get() as { elements?: Array<{ id: string; type: string }> }).elements?.find?.((el) => el.id === targetId);
      if (!element || element.type !== 'nativeText') {
        console.warn('Text position animation requires a nativeText element');
        return;
      }
      const addAnimation = get().addAnimation;
      addAnimation?.({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'x',
        targetElementId: targetId,
        dur,
        from: String(fromX),
        to: String(toX),
        repeatCount: 1,
        fill: 'freeze',
      });
      addAnimation?.({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'y',
        targetElementId: targetId,
        dur,
        from: String(fromY),
        to: String(toY),
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createFilterBlurAnimation: (targetId, dur = '2s', fromStdDev = 0, toStdDev = 5) => {
      if (!isSupportedElement(targetId, [{ type: 'path' }, { type: 'nativeText' }, { type: 'nativeShape' }, { type: 'symbolInstance' }, { type: 'image' }])) return;
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'stdDeviation',
        targetElementId: targetId,
        dur,
        from: String(fromStdDev),
        to: String(toStdDev),
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createFilterOffsetAnimation: (targetId, dur = '2s', fromDx = 0, fromDy = 0, toDx = 10, toDy = 10) => {
      if (!isSupportedElement(targetId, [{ type: 'path' }, { type: 'nativeText' }, { type: 'nativeShape' }, { type: 'symbolInstance' }, { type: 'image' }])) return;
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'dx',
        targetElementId: targetId,
        dur,
        from: String(fromDx),
        to: String(toDx),
        repeatCount: 1,
        fill: 'freeze',
      });
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'dy',
        targetElementId: targetId,
        dur,
        from: String(fromDy),
        to: String(toDy),
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createFilterColorMatrixAnimation: (targetId, dur = '2s', fromValues = '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0', toValues = '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0') => {
      if (!isSupportedElement(targetId, [{ type: 'path' }, { type: 'nativeText' }, { type: 'nativeShape' }, { type: 'symbolInstance' }, { type: 'image' }])) return;
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'values',
        targetElementId: targetId,
        dur,
        from: fromValues,
        to: toValues,
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createFilterFloodAnimation: (targetId, dur = '2s', fromColor = '#ff0000', toColor = '#0000ff') => {
      if (!isSupportedElement(targetId, [{ type: 'path' }, { type: 'nativeText' }, { type: 'nativeShape' }, { type: 'symbolInstance' }, { type: 'image' }])) return;
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'flood-color',
        targetElementId: targetId,
        dur,
        from: fromColor,
        to: toColor,
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createViewBoxAnimation: (dur = '2s', fromViewBox = '0 0 100 100', toViewBox = '0 0 200 200') => {
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'viewBox',
        targetElementId: 'svg-root',
        dur,
        from: fromViewBox,
        to: toViewBox,
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createGradientStopAnimation: (stopId, dur = '2s', fromColor = '#ff0000', toColor = '#0000ff') => {
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'stop-color',
        targetElementId: stopId,
        dur,
        from: fromColor,
        to: toColor,
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createGradientPositionAnimation: (gradientId, dur = '2s', attribute = 'x1', fromValue = '0%', toValue = '100%') => {
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: attribute,
        targetElementId: gradientId,
        dur,
        from: fromValue,
        to: toValue,
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createLinearGradientAnimation: (
      gradientId,
      dur = '2s',
      from = { x1: 0, y1: 0, x2: 100, y2: 0 },
      to = { x1: 100, y1: 100, x2: 0, y2: 100 }
    ) => {
      (['x1', 'y1', 'x2', 'y2'] as const).forEach((attr) => {
        get().addAnimation({
          id: generateAnimationId(),
          type: 'animate',
          attributeName: attr,
          targetElementId: gradientId,
          dur,
          from: `${(from as Record<string, number>)[attr] ?? 0}%`,
          to: `${(to as Record<string, number>)[attr] ?? 0}%`,
          repeatCount: 1,
          fill: 'freeze',
        });
      });
    },

    createRadialGradientAnimation: (
      gradientId,
      dur = '2s',
      from = { cx: 50, cy: 50, r: 25 },
      to = { cx: 25, cy: 25, r: 75 }
    ) => {
      ([
        { attr: 'cx', from: from.cx, to: to.cx },
        { attr: 'cy', from: from.cy, to: to.cy },
        { attr: 'r', from: from.r, to: to.r },
      ] as const).forEach(({ attr, from: f, to: t }) => {
        get().addAnimation({
          id: generateAnimationId(),
          type: 'animate',
          attributeName: attr,
          targetElementId: gradientId,
          dur,
          from: `${f ?? 0}%`,
          to: `${t ?? 0}%`,
          repeatCount: 1,
          fill: 'freeze',
        });
      });
    },

    createGradientStopOffsetAnimation: (stopId, dur = '2s', fromOffset = 0, toOffset = 100) => {
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animate',
        attributeName: 'offset',
        targetElementId: stopId,
        dur,
        from: `${fromOffset}%`,
        to: `${toOffset}%`,
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createPatternAnimation: (
      patternId,
      dur = '2s',
      fromSize = { width: 10, height: 10 },
      toSize = { width: 50, height: 50 }
    ) => {
      (['width', 'height'] as const).forEach((attr) => {
        get().addAnimation({
          id: generateAnimationId(),
          type: 'animate',
          attributeName: attr,
          targetElementId: patternId,
          dur,
          from: String((fromSize as Record<string, number>)[attr] ?? 0),
          to: String((toSize as Record<string, number>)[attr] ?? 0),
          repeatCount: 1,
          fill: 'freeze',
        });
      });
    },

    createPatternTransformAnimation: (patternId, dur = '2s', fromTransform = 'rotate(0)', toTransform = 'rotate(360)') => {
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animateTransform',
        attributeName: 'patternTransform',
        transformType: 'rotate',
        targetElementId: patternId,
        dur,
        from: fromTransform,
        to: toTransform,
        repeatCount: 1,
        fill: 'freeze',
      });
    },

    createAnimateMotionWithMPath: (targetId, pathId, dur = '2s', rotate = 'auto') => {
      get().addAnimation({
        id: generateAnimationId(),
        type: 'animateMotion',
        targetElementId: targetId,
        mpath: pathId,
        dur,
        rotate,
        fill: 'freeze',
      });
    },

    updateAnimationMPath: (animationId, pathId) => {
      get().updateAnimation(animationId, {
        mpath: pathId,
        path: undefined,
      });
    },

    playAnimations: () => {
      const state = get();
      const delays = state.calculateChainDelays();

      // Auto-restart logic: if at the end, start from 0
      let currentTime = state.animationState.currentTime;
      const animations = state.animations;
      if (animations.length > 0) {
        const durations = animations.map((anim) => {
          const delayMs = delays.get(anim.id) ?? 0;
          return computeTotalDurationSeconds(anim) + delayMs / 1000;
        });
        const finiteDurations = durations.filter((dur) => Number.isFinite(dur));
        if (finiteDurations.length > 0) {
          const maxDuration = Math.max(...finiteDurations);
          if (currentTime >= maxDuration - 0.05) {
            currentTime = 0;
          }
        }
      }

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const offset = (currentTime / Math.max(state.animationState.playbackRate, 0.0001)) * 1000;
      const startTime = now - offset;

      set((current) => ({
        animationState: {
          ...current.animationState,
          isPlaying: true,
          hasPlayed: true,
          startTime,
          currentTime,
          chainDelays: delays,
        },
      }));
    },

    pauseAnimations: () => {
      const state = get();
      set((current) => ({
        animationState: {
          ...current.animationState,
          isPlaying: false,
          startTime: null,
          currentTime: state.animationState.currentTime,
        },
      }));
    },

    stopAnimations: () => {
      set((current) => ({
        animationState: {
          ...current.animationState,
          isPlaying: false,
          hasPlayed: false,
          startTime: null,
          currentTime: 0,
          restartKey: current.animationState.restartKey + 1,
          chainDelays: new Map(),
        },
      }));
    },

    setAnimationTime: (time) => {
      set((current) => ({
        animationState: {
          ...current.animationState,
          currentTime: Math.max(0, time),
        },
      }));
    },

    setPlaybackRate: (rate) => {
      set((current) => ({
        animationState: {
          ...current.animationState,
          playbackRate: Math.max(0.1, rate),
        },
      }));
    },

    calculateChainDelays: () => {
      const { animationSync, animations } = get();
      const delays = new Map<string, number>();

      animationSync.chains.forEach((chain) => {
        let cursorMs = 0;
        chain.animations.forEach((entry: AnimationChainEntry) => {
          const animation = animations.find((a) => a.id === entry.animationId);
          const durationSeconds = computeTotalDurationSeconds(animation);
          const durMs = Number.isFinite(durationSeconds) ? durationSeconds * 1000 : 0;
          const entryDelayMs = Math.max(0, entry.delay) * 1000;
          const base = entry.trigger === 'end' ? cursorMs + entryDelayMs : entryDelayMs;
          delays.set(entry.animationId, base);

          if (entry.trigger === 'end') {
            cursorMs = base + durMs;
          } else {
            cursorMs = Math.max(cursorMs, base);
          }
        });
      });

      return delays;
    },

    setAnimationDelay: (animationId: string, delayMs: number) => {
      set((current) => {
        const newDelays = new Map(current.animationState.chainDelays);
        newDelays.set(animationId, Math.max(0, delayMs));
        return {
          animationState: {
            ...current.animationState,
            chainDelays: newDelays,
          },
        };
      });
    },

    processAnimationEvents: () => {
      const delays = get().calculateChainDelays();
      const syncEvent = {
        id: generateAnimationId(),
        type: 'sync' as const,
        sourceAnimationId: 'chain',
        timestamp: Date.now(),
        handled: true,
      };
      set((current) => ({
        animationState: {
          ...current.animationState,
          chainDelays: delays,
        },
        animationSync: {
          ...current.animationSync,
          events: [
            ...current.animationSync.events,
            syncEvent,
          ].slice(-20),
        },
      }));
    },

    createAnimationChain: (name, entries) => {
      const id = `anim-chain-${generateAnimationId()}`;
      const chainEntries = entries.map((entry) => ({
        ...entry,
        delay: Math.max(0, entry.delay),
      }));
      set((state) => ({
        animationSync: {
          ...state.animationSync,
          chains: [...state.animationSync.chains, { id, name, animations: chainEntries }],
        },
      }));
    },

    updateAnimationChain: (id, updates) => {
      set((state) => ({
        animationSync: {
          ...state.animationSync,
          chains: state.animationSync.chains.map((chain) =>
            chain.id === id ? { ...chain, ...updates } : chain
          ),
        },
      }));
    },

    updateChainAnimationDelay: (chainId, animationId, delay) => {
      set((state) => ({
        animationSync: {
          ...state.animationSync,
          chains: state.animationSync.chains.map((chain) => {
            if (chain.id !== chainId) return chain;
            return {
              ...chain,
              animations: chain.animations.map((entry) =>
                entry.animationId === animationId ? { ...entry, delay: Math.max(0, delay) } : entry
              ),
            };
          }),
        },
      }));
    },

    updateChainAnimationTrigger: (chainId, animationId, trigger) => {
      set((state) => ({
        animationSync: {
          ...state.animationSync,
          chains: state.animationSync.chains.map((chain) => {
            if (chain.id !== chainId) return chain;
            return {
              ...chain,
              animations: chain.animations.map((entry) =>
                entry.animationId === animationId ? { ...entry, trigger } : entry
              ),
            };
          }),
        },
      }));
    },

    removeAnimationChain: (id) => {
      set((state) => ({
        animationSync: {
          ...state.animationSync,
          chains: state.animationSync.chains.filter((chain) => chain.id !== id),
        },
      }));
    },

    setAnimationWorkspaceOpen: (isOpen) => {
      set((state) => ({
        animationState: {
          ...state.animationState,
          isWorkspaceOpen: isOpen,
        },
      }));
    },

    setTimelineLabelWidth: (width) => {
      set(() => ({
        timelineLabelWidth: width,
      }));
    },

    setCanvasPreviewMode: (isActive) => {
      set((state) => ({
        animationState: {
          ...state.animationState,
          isCanvasPreviewMode: isActive,
          // Reset playback state when entering/exiting preview mode
          isPlaying: false,
          currentTime: 0,
          hasPlayed: false,
        },
      }));
    },

    playCanvasPreview: () => {
      set((state) => ({
        animationState: {
          ...state.animationState,
          isCanvasPreviewMode: true,
          isPlaying: true,
          hasPlayed: true,
          startTime: Date.now(),
          restartKey: state.animationState.restartKey + 1,
        },
      }));
    },

    pauseCanvasPreview: () => {
      set((state) => ({
        animationState: {
          ...state.animationState,
          isPlaying: false,
        },
      }));
    },

    stopCanvasPreview: () => {
      set((state) => ({
        animationState: {
          ...state.animationState,
          isCanvasPreviewMode: false,
          isPlaying: false,
          currentTime: 0,
          hasPlayed: false,
        },
      }));
    },
  };
};
