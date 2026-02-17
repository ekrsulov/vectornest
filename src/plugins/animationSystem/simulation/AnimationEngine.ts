/**
 * Animation Simulation Engine
 * 
 * Core engine for calculating animation states at any given time.
 * Used during editing to preview animations without triggering native SMIL.
 * Only at export time does the system generate actual SMIL XML.
 */

import type { CanvasElement } from '../../../types';
import type { SVGAnimation } from '../types';
import type { ElementAnimationState, QualitySettings, SimulationQuality } from '../gizmos/types';

/**
 * Quality presets for different use cases
 */
const QUALITY_PRESETS: Record<SimulationQuality, QualitySettings> = {
  editing: { mode: 'editing', filterQuality: 'low', updateRate: 30, disableFilters: true },
  preview: { mode: 'preview', filterQuality: 'medium', updateRate: 60, disableFilters: false },
  export: { mode: 'export', filterQuality: 'high', updateRate: 60, disableFilters: false },
};

/**
 * Listener for time updates
 */
export type TimeUpdateListener = (time: number, states: Map<string, ElementAnimationState>) => void;

/**
 * Animation Simulation Engine
 * 
 * Provides a JavaScript-based animation simulation that calculates
 * element states at any point in time. This is used for:
 * 
 * 1. Gizmo preview during editing
 * 2. Timeline scrubbing
 * 3. Animation workspace preview
 * 
 * The engine does NOT modify the actual canvas elements. Instead, it
 * provides calculated states that overlays can use for visualization.
 */
export class AnimationEngine {
  private elementStates = new Map<string, ElementAnimationState>();
  private rafId: number | null = null;
  private startTime: number | null = null;
  private pausedTime: number = 0;
  private isPlaying = false;
  private listeners = new Set<TimeUpdateListener>();
  private quality: QualitySettings = QUALITY_PRESETS.editing;
  private lastUpdateTime = 0;

  // Cached animations and elements for the current simulation
  private animations: SVGAnimation[] = [];
  private elementMap = new Map<string, CanvasElement>();

  /**
   * Set the quality mode for simulation
   */
  setQuality(mode: SimulationQuality): void {
    this.quality = QUALITY_PRESETS[mode];
  }

  /**
   * Get current quality settings
   */
  getQuality(): QualitySettings {
    return this.quality;
  }

  /**
   * Update the animations and elements to simulate
   */
  setData(animations: SVGAnimation[], elements: CanvasElement[]): void {
    this.animations = animations;
    this.elementMap.clear();
    elements.forEach((el) => this.elementMap.set(el.id, el));
  }

  /**
   * Calculate the state of a single element at a specific time
   */
  calculateElementState(
    element: CanvasElement,
    animations: SVGAnimation[],
    time: number
  ): ElementAnimationState {
    const elementAnimations = animations.filter(
      (a) => a.targetElementId === element.id
    );

    const state: ElementAnimationState = {
      elementId: element.id,
      time,
    };

    for (const animation of elementAnimations) {
      this.applyAnimation(state, animation, time);
    }

    return state;
  }

  /**
   * Calculate states for all elements at a specific time
   */
  calculateAllStates(time: number): Map<string, ElementAnimationState> {
    const states = new Map<string, ElementAnimationState>();

    // Group animations by target element for efficiency
    const animationsByElement = new Map<string, SVGAnimation[]>();
    for (const anim of this.animations) {
      const existing = animationsByElement.get(anim.targetElementId) ?? [];
      existing.push(anim);
      animationsByElement.set(anim.targetElementId, existing);
    }

    // Calculate state for each animated element
    for (const [elementId, anims] of animationsByElement) {
      const element = this.elementMap.get(elementId);
      if (!element) continue;

      const state = this.calculateElementState(element, anims, time);
      states.set(elementId, state);
    }

    return states;
  }

  /**
   * Apply a single animation to an element state
   */
  private applyAnimation(
    state: ElementAnimationState,
    animation: SVGAnimation,
    time: number
  ): void {
    const progress = this.calculateProgress(animation, time);

    switch (animation.type) {
      case 'animateTransform':
        this.applyTransform(state, animation, progress);
        break;
      case 'animateMotion':
        this.applyMotionPath(state, animation, progress);
        break;
      case 'animate':
        this.applyAttribute(state, animation, progress);
        break;
      case 'set':
        this.applySet(state, animation, time);
        break;
    }
  }

  /**
   * Calculate animation progress (0-1) considering timing attributes
   */
  private calculateProgress(animation: SVGAnimation, time: number): number {
    const begin = this.parseTime(animation.begin ?? '0s');
    const dur = this.parseTime(animation.dur ?? '1s');
    const repeatCount =
      animation.repeatCount === 'indefinite'
        ? Infinity
        : (animation.repeatCount ?? 1);

    const localTime = time - begin;
    if (localTime < 0) return 0;

    const totalDuration = dur * repeatCount;
    if (localTime >= totalDuration && repeatCount !== Infinity) {
      return animation.fill === 'freeze' ? 1 : 0;
    }

    // Progress within one iteration
    const iterationTime = localTime % dur;
    let progress = iterationTime / dur;

    // Apply easing
    if (animation.calcMode === 'spline' && animation.keySplines) {
      progress = this.applySplineEasing(progress, animation);
    } else if (animation.keyTimes) {
      progress = this.applyKeyTimesEasing(progress, animation);
    }

    return Math.max(0, Math.min(1, progress));
  }

  /**
   * Parse SVG time value (e.g., "2s", "500ms", "0.5")
   */
  private parseTime(timeStr: string): number {
    if (typeof timeStr !== 'string') return 0;
    const str = timeStr.trim();
    if (str.endsWith('ms')) {
      return parseFloat(str) / 1000;
    }
    if (str.endsWith('s')) {
      return parseFloat(str);
    }
    return parseFloat(str) || 0;
  }

  /**
   * Apply spline easing using keySplines
   */
  private applySplineEasing(
    progress: number,
    animation: SVGAnimation
  ): number {
    if (!animation.keySplines) return progress;

    // Parse keySplines (format: "x1 y1 x2 y2; x1 y1 x2 y2; ...")
    const splines = animation.keySplines.split(';').map((s) => {
      const parts = s.trim().split(/[\s,]+/).map(parseFloat);
      return { x1: parts[0], y1: parts[1], x2: parts[2], y2: parts[3] };
    });

    if (splines.length === 0) return progress;

    // For now, use the first spline (full implementation would use keyTimes)
    const spline = splines[0];
    return this.cubicBezier(progress, spline.x1, spline.y1, spline.x2, spline.y2);
  }

  /**
   * Apply keyTimes-based easing
   */
  private applyKeyTimesEasing(
    progress: number,
    animation: SVGAnimation
  ): number {
    if (!animation.keyTimes) return progress;

    const keyTimes = animation.keyTimes.split(';').map(parseFloat);
    if (keyTimes.length < 2) return progress;

    // Find the segment we're in
    for (let i = 0; i < keyTimes.length - 1; i++) {
      if (progress <= keyTimes[i + 1]) {
        const segmentStart = keyTimes[i];
        const segmentEnd = keyTimes[i + 1];
        const segmentProgress = (progress - segmentStart) / (segmentEnd - segmentStart);

        // Apply spline for this segment if available
        if (animation.keySplines) {
          const splines = animation.keySplines.split(';');
          if (splines[i]) {
            const parts = splines[i].trim().split(/[\s,]+/).map(parseFloat);
            return this.cubicBezier(
              segmentProgress,
              parts[0], parts[1], parts[2], parts[3]
            );
          }
        }

        return segmentProgress;
      }
    }

    return progress;
  }

  /**
   * Cubic bezier interpolation
   */
  private cubicBezier(
    t: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    // Simple approximation - for accurate results, use Newton-Raphson
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;

    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    // Sample the curve
    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;

    // Find t for x using binary search
    let low = 0;
    let high = 1;
    let mid = t;

    for (let i = 0; i < 10; i++) {
      const x = sampleX(mid);
      if (Math.abs(x - t) < 0.001) break;
      if (x < t) {
        low = mid;
      } else {
        high = mid;
      }
      mid = (low + high) / 2;
    }

    return sampleY(mid);
  }

  /**
   * Apply transform animation to state
   */
  private applyTransform(
    state: ElementAnimationState,
    animation: SVGAnimation,
    progress: number
  ): void {
    if (!animation.transformType) return;

    // Initialize transform if needed
    if (!state.transform) {
      state.transform = {
        translateX: 0,
        translateY: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
      };
    }

    const from = this.parseTransformValue(animation.from, animation.transformType);
    const to = this.parseTransformValue(animation.to, animation.transformType);

    switch (animation.transformType) {
      case 'translate': {
        state.transform.translateX = this.lerp(from[0] ?? 0, to[0] ?? 0, progress);
        state.transform.translateY = this.lerp(from[1] ?? 0, to[1] ?? 0, progress);
        break;
      }
      case 'rotate': {
        state.transform.rotate = this.lerp(from[0] ?? 0, to[0] ?? 0, progress);
        if (from[1] !== undefined) state.transform.rotateCx = from[1];
        if (from[2] !== undefined) state.transform.rotateCy = from[2];
        break;
      }
      case 'scale': {
        const fromScale = from[0] ?? 1;
        const toScale = to[0] ?? 1;
        state.transform.scaleX = this.lerp(fromScale, toScale, progress);
        state.transform.scaleY = this.lerp(from[1] ?? fromScale, to[1] ?? toScale, progress);
        break;
      }
      case 'skewX': {
        state.transform.skewX = this.lerp(from[0] ?? 0, to[0] ?? 0, progress);
        break;
      }
      case 'skewY': {
        state.transform.skewY = this.lerp(from[0] ?? 0, to[0] ?? 0, progress);
        break;
      }
    }
  }

  /**
   * Parse transform value string into array of numbers
   */
  private parseTransformValue(
    value: string | number | undefined,
    _type: string
  ): number[] {
    if (value === undefined) return [];
    if (typeof value === 'number') return [value];
    return value.split(/[\s,]+/).map(parseFloat).filter((n) => !isNaN(n));
  }

  /**
   * Apply motion path animation to state
   */
  private applyMotionPath(
    state: ElementAnimationState,
    animation: SVGAnimation,
    _progress: number
  ): void {
    // Motion path calculation requires path parsing
    // For now, provide a simplified linear interpolation
    if (!animation.path) return;

    // TODO: Implement full path interpolation with keyPoints
    // This would parse the path and calculate position/angle at progress

    state.motionPath = {
      position: { x: 0, y: 0 }, // Placeholder
      angle: 0,
    };
  }

  /**
   * Apply attribute animation to state
   */
  private applyAttribute(
    state: ElementAnimationState,
    animation: SVGAnimation,
    progress: number
  ): void {
    if (!animation.attributeName) return;

    const from = animation.from;
    const to = animation.to;

    // Initialize attributes if needed
    if (!state.attributes) {
      state.attributes = {};
    }

    // Handle special style attributes
    switch (animation.attributeName) {
      case 'opacity': {
        if (!state.style) state.style = {};
        state.style.opacity = this.lerp(
          parseFloat(String(from ?? 1)),
          parseFloat(String(to ?? 0)),
          progress
        );
        break;
      }
      case 'fill': {
        if (!state.style) state.style = {};
        state.style.fillColor = this.interpolateColor(
          String(from ?? '#000000'),
          String(to ?? '#000000'),
          progress
        );
        break;
      }
      case 'stroke': {
        if (!state.style) state.style = {};
        state.style.strokeColor = this.interpolateColor(
          String(from ?? '#000000'),
          String(to ?? '#000000'),
          progress
        );
        break;
      }
      case 'stroke-width': {
        if (!state.style) state.style = {};
        state.style.strokeWidth = this.lerp(
          parseFloat(String(from ?? 1)),
          parseFloat(String(to ?? 1)),
          progress
        );
        break;
      }
      case 'stroke-dashoffset': {
        if (!state.style) state.style = {};
        state.style.strokeDashoffset = this.lerp(
          parseFloat(String(from ?? 0)),
          parseFloat(String(to ?? 0)),
          progress
        );
        break;
      }
      case 'd': {
        // Path morphing - interpolate between path values
        if (animation.values) {
          // Multiple keyframes - find the right segment
          const keyframes = animation.values.split(';').map(v => v.trim());
          if (keyframes.length > 1) {
            const segmentIndex = Math.floor(progress * (keyframes.length - 1));
            const nextIndex = Math.min(segmentIndex + 1, keyframes.length - 1);
            const segmentProgress = (progress * (keyframes.length - 1)) - segmentIndex;
            
            // For now, use discrete switching between keyframes
            // TODO: Implement proper path interpolation algorithm
            state.pathData = segmentProgress < 0.5 ? keyframes[segmentIndex] : keyframes[nextIndex];
          } else {
            state.pathData = keyframes[0] ?? String(from);
          }
        } else {
          // Simple from/to - discrete switching for now
          // TODO: Implement proper path interpolation
          state.pathData = progress < 0.5 ? String(from) : String(to);
        }
        break;
      }
      default: {
        // Numeric attribute interpolation
        const fromNum = parseFloat(String(from ?? 0));
        const toNum = parseFloat(String(to ?? 0));
        if (!isNaN(fromNum) && !isNaN(toNum)) {
          state.attributes[animation.attributeName] = this.lerp(fromNum, toNum, progress);
        } else {
          // Discrete value
          state.attributes[animation.attributeName] = progress < 0.5 ? from! : to!;
        }
      }
    }
  }

  /**
   * Apply set animation to state
   */
  private applySet(
    state: ElementAnimationState,
    animation: SVGAnimation,
    time: number
  ): void {
    if (!animation.attributeName) return;

    const begin = this.parseTime(animation.begin ?? '0s');
    const dur = animation.dur ? this.parseTime(animation.dur) : Infinity;

    // Set is active if time is within begin and begin+dur
    const isActive = time >= begin && time < begin + dur;

    if (isActive && animation.to !== undefined) {
      if (!state.attributes) state.attributes = {};
      state.attributes[animation.attributeName] = animation.to;
    }
  }

  /**
   * Linear interpolation
   */
  private lerp(from: number, to: number, t: number): number {
    return from + (to - from) * t;
  }

  /**
   * Color interpolation (simplified - assumes hex colors)
   */
  private interpolateColor(from: string, to: string, t: number): string {
    const fromRgb = this.hexToRgb(from);
    const toRgb = this.hexToRgb(to);

    if (!fromRgb || !toRgb) return t < 0.5 ? from : to;

    const r = Math.round(this.lerp(fromRgb.r, toRgb.r, t));
    const g = Math.round(this.lerp(fromRgb.g, toRgb.g, t));
    const b = Math.round(this.lerp(fromRgb.b, toRgb.b, t));

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Parse hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!match) return null;
    return {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16),
    };
  }

  // ==========================================================================
  // Playback Control
  // ==========================================================================

  /**
   * Start playback from current position
   */
  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now() - this.pausedTime * 1000;
    this.tick();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Stop playback and reset to start
   */
  stop(): void {
    this.pause();
    this.pausedTime = 0;
    this.startTime = null;
    this.notifyListeners(0);
  }

  /**
   * Seek to a specific time
   */
  seekTo(time: number): void {
    this.pausedTime = time;
    if (this.isPlaying) {
      this.startTime = performance.now() - time * 1000;
    }
    this.notifyListeners(time);
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.pausedTime;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Main animation frame tick
   */
  private tick = (): void => {
    if (!this.isPlaying || this.startTime === null) return;

    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000;

    // Throttle based on quality settings
    const minInterval = 1000 / this.quality.updateRate;
    if (now - this.lastUpdateTime >= minInterval) {
      this.pausedTime = elapsed;
      this.notifyListeners(elapsed);
      this.lastUpdateTime = now;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Subscribe to time updates
   */
  subscribe(listener: TimeUpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(time: number): void {
    const states = this.calculateAllStates(time);
    this.elementStates = states;

    this.listeners.forEach((listener) => {
      try {
        listener(time, states);
      } catch (error) {
        console.error('[AnimationEngine] Error in listener:', error);
      }
    });
  }

  /**
   * Get cached element states
   */
  getElementStates(): Map<string, ElementAnimationState> {
    return this.elementStates;
  }

  /**
   * Dispose the engine and clean up
   */
  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.elementStates.clear();
    this.animations = [];
    this.elementMap.clear();
  }
}

/**
 * Global singleton instance of the animation engine.
 */
export const animationEngine = new AnimationEngine();
