/**
 * SMIL Compiler
 * 
 * Compiles internal animation representations to valid SVG SMIL XML.
 * This is the bridge between the JavaScript-based editing experience
 * and the final self-contained SVG output.
 */

import type { SVGAnimation } from '../types';
import type { SMILCompileOptions, SMILCompileResult } from '../gizmos/types';

/**
 * Default compilation options
 */
const DEFAULT_OPTIONS: SMILCompileOptions = {
  optimize: true,
  precision: 4,
  includeComments: false,
  compatibility: 'standard',
};

/**
 * SMIL Compiler
 * 
 * Translates internal animation definitions to valid SMIL XML elements.
 * Supports all SMIL animation types:
 * - animate (attribute animations)
 * - animateTransform (transform animations)
 * - animateMotion (motion path animations)
 * - set (discrete attribute changes)
 */
export class SMILCompiler {
  private options: SMILCompileOptions = DEFAULT_OPTIONS;

  /**
   * Set default options for all compilations
   */
  setDefaultOptions(options: Partial<SMILCompileOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Compile a single animation to SMIL XML
   */
  compile(animation: SVGAnimation, options?: Partial<SMILCompileOptions>): string {
    const opts = { ...this.options, ...options };

    switch (animation.type) {
      case 'animate':
        return this.compileAnimate(animation, opts);
      case 'animateTransform':
        return this.compileAnimateTransform(animation, opts);
      case 'animateMotion':
        return this.compileAnimateMotion(animation, opts);
      case 'set':
        return this.compileSet(animation, opts);
      default:
        throw new Error(`Unknown animation type: ${(animation as SVGAnimation).type}`);
    }
  }

  /**
   * Compile multiple animations with optimization
   */
  compileAll(
    animations: SVGAnimation[],
    options?: Partial<SMILCompileOptions>
  ): SMILCompileResult {
    const opts = { ...this.options, ...options };
    const result: SMILCompileResult = {
      elements: [],
      warnings: [],
      defs: [],
    };

    // Group by target for potential optimization
    const byTarget = this.groupByTarget(animations);

    for (const [_targetId, targetAnimations] of byTarget) {
      for (const animation of targetAnimations) {
        try {
          const compiled = this.compile(animation, opts);
          result.elements.push(compiled);
        } catch (error) {
          result.warnings.push(
            `Failed to compile animation ${animation.id}: ${error}`
          );
        }
      }
    }

    if (opts.optimize) {
      this.optimizeResult(result, opts);
    }

    return result;
  }

  /**
   * Compile an <animate> element
   */
  private compileAnimate(
    animation: SVGAnimation,
    opts: SMILCompileOptions
  ): string {
    if (!animation.attributeName) {
      throw new Error('animate requires attributeName');
    }

    const attrs: Record<string, string> = {
      attributeName: animation.attributeName,
    };

    // Values take precedence over from/to
    if (animation.values) {
      attrs.values = this.formatValues(animation.values, opts);
    } else {
      if (animation.from !== undefined) {
        attrs.from = this.formatValue(animation.from, opts);
      }
      if (animation.to !== undefined) {
        attrs.to = this.formatValue(animation.to, opts);
      }
    }

    this.addCommonAttributes(attrs, animation, opts);
    this.addAdditiveAttributes(attrs, animation);

    return this.buildElement('animate', attrs);
  }

  /**
   * Compile an <animateTransform> element
   */
  private compileAnimateTransform(
    animation: SVGAnimation,
    opts: SMILCompileOptions
  ): string {
    if (!animation.transformType) {
      throw new Error('animateTransform requires transformType');
    }

    const attrs: Record<string, string> = {
      attributeName: 'transform',
      type: animation.transformType,
    };

    if (animation.values) {
      attrs.values = this.formatValues(animation.values, opts);
    } else {
      if (animation.from !== undefined) {
        attrs.from = this.formatValue(animation.from, opts);
      }
      if (animation.to !== undefined) {
        attrs.to = this.formatValue(animation.to, opts);
      }
    }

    this.addCommonAttributes(attrs, animation, opts);
    this.addAdditiveAttributes(attrs, animation);

    return this.buildElement('animateTransform', attrs);
  }

  /**
   * Compile an <animateMotion> element
   */
  private compileAnimateMotion(
    animation: SVGAnimation,
    opts: SMILCompileOptions
  ): string {
    const attrs: Record<string, string> = {};

    // Path can be inline or via mpath reference
    if (animation.path && !animation.mpath) {
      attrs.path = this.optimizePath(animation.path, opts);
    }

    if (animation.rotate !== undefined) {
      attrs.rotate = String(animation.rotate);
    }

    if (animation.keyPoints) {
      attrs.keyPoints = this.formatKeyPoints(animation.keyPoints, opts);
    }

    this.addCommonAttributes(attrs, animation, opts);

    // Handle mpath child element
    if (animation.mpath) {
      const mpathChild = `<mpath href="#${this.escapeAttribute(animation.mpath)}"/>`;
      return this.buildElement('animateMotion', attrs, mpathChild);
    }

    return this.buildElement('animateMotion', attrs);
  }

  /**
   * Compile a <set> element
   */
  private compileSet(
    animation: SVGAnimation,
    opts: SMILCompileOptions
  ): string {
    if (!animation.attributeName) {
      throw new Error('set requires attributeName');
    }

    const attrs: Record<string, string> = {
      attributeName: animation.attributeName,
    };

    if (animation.to !== undefined) {
      attrs.to = this.formatValue(animation.to, opts);
    }

    // Set has limited timing attributes
    if (animation.begin) attrs.begin = animation.begin;
    if (animation.dur) attrs.dur = animation.dur;
    if (animation.end) attrs.end = animation.end;
    if (animation.fill) attrs.fill = animation.fill;

    return this.buildElement('set', attrs);
  }

  /**
   * Add common timing attributes to an element
   */
  private addCommonAttributes(
    attrs: Record<string, string>,
    animation: SVGAnimation,
    _opts: SMILCompileOptions
  ): void {
    if (animation.dur) attrs.dur = animation.dur;
    if (animation.begin) attrs.begin = animation.begin;
    if (animation.end) attrs.end = animation.end;
    if (animation.fill) attrs.fill = animation.fill;

    if (animation.repeatCount !== undefined) {
      attrs.repeatCount = String(animation.repeatCount);
    }
    if (animation.repeatDur) {
      attrs.repeatDur = animation.repeatDur;
    }

    // Calc mode (only include if non-default)
    if (animation.calcMode && animation.calcMode !== 'linear') {
      attrs.calcMode = animation.calcMode;
    }

    if (animation.keyTimes) {
      attrs.keyTimes = animation.keyTimes;
    }
    if (animation.keySplines) {
      attrs.keySplines = animation.keySplines;
    }
  }

  /**
   * Add additive/accumulate attributes
   */
  private addAdditiveAttributes(
    attrs: Record<string, string>,
    animation: SVGAnimation
  ): void {
    // Only include if non-default
    if (animation.additive && animation.additive !== 'replace') {
      attrs.additive = animation.additive;
    }
    if (animation.accumulate && animation.accumulate !== 'none') {
      attrs.accumulate = animation.accumulate;
    }
  }

  /**
   * Build an XML element string
   */
  private buildElement(
    tag: string,
    attrs: Record<string, string>,
    children?: string
  ): string {
    const attrStr = Object.entries(attrs)
      .filter(([_, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}="${this.escapeAttribute(v)}"`)
      .join(' ');

    if (children) {
      return `<${tag} ${attrStr}>${children}</${tag}>`;
    }
    return `<${tag} ${attrStr}/>`;
  }

  /**
   * Escape special characters in attribute values
   */
  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Format a single value with precision
   */
  private formatValue(
    value: string | number,
    opts: SMILCompileOptions
  ): string {
    if (typeof value === 'number') {
      return this.roundNumber(value, opts.precision ?? 4);
    }
    // Try to parse and round numeric values in strings
    const parts = String(value).split(/[\s,]+/);
    const formatted = parts.map((part) => {
      const num = parseFloat(part);
      if (!isNaN(num)) {
        return this.roundNumber(num, opts.precision ?? 4);
      }
      return part;
    });
    return formatted.join(' ');
  }

  /**
   * Format values attribute (semicolon-separated)
   */
  private formatValues(
    values: string,
    opts: SMILCompileOptions
  ): string {
    return values
      .split(';')
      .map((v) => this.formatValue(v.trim(), opts))
      .join(';');
  }

  /**
   * Format keyPoints attribute
   */
  private formatKeyPoints(
    keyPoints: string,
    opts: SMILCompileOptions
  ): string {
    return keyPoints
      .split(';')
      .map((v) => this.roundNumber(parseFloat(v.trim()), opts.precision ?? 4))
      .join(';');
  }

  /**
   * Round a number to specified precision
   */
  private roundNumber(num: number, precision: number): string {
    const rounded = parseFloat(num.toFixed(precision));
    return String(rounded);
  }

  /**
   * Optimize path data by reducing precision and removing redundant commands
   */
  private optimizePath(path: string, opts: SMILCompileOptions): string {
    if (!opts.optimize) return path;

    // Basic optimization: round numeric values in path
    return path.replace(/-?\d+\.?\d*/g, (match) => {
      const num = parseFloat(match);
      return this.roundNumber(num, opts.precision ?? 4);
    });
  }

  /**
   * Group animations by target element
   */
  private groupByTarget(
    animations: SVGAnimation[]
  ): Map<string, SVGAnimation[]> {
    const groups = new Map<string, SVGAnimation[]>();
    for (const anim of animations) {
      const target = anim.targetElementId;
      const group = groups.get(target) ?? [];
      group.push(anim);
      groups.set(target, group);
    }
    return groups;
  }

  /**
   * Optimize the compilation result
   */
  private optimizeResult(
    _result: SMILCompileResult,
    _opts: SMILCompileOptions
  ): void {
    // Future optimizations:
    // - Merge consecutive animations with same timing
    // - Remove redundant keyTimes (0;1 for simple from/to)
    // - Consolidate additive animations
    // - Remove animations that have no effect
  }

  /**
   * Generate a complete SVG document with animations embedded
   */
  compileSVGDocument(
    svgContent: string,
    animations: SVGAnimation[],
    options?: Partial<SMILCompileOptions>
  ): string {
    const result = this.compileAll(animations, options);

    // Insert animations into the SVG
    // This is a simplified version - full implementation would
    // properly parse SVG and insert animations as children of their targets
    
    if (result.warnings.length > 0) {
      console.warn('[SMILCompiler] Compilation warnings:', result.warnings);
    }

    // Return the SVG with embedded animations
    // Note: Actual embedding requires proper DOM manipulation
    return svgContent;
  }

  /**
   * Validate an animation definition
   */
  validate(animation: SVGAnimation): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!animation.type) {
      errors.push('Animation type is required');
    }

    if (!animation.targetElementId) {
      errors.push('Target element ID is required');
    }

    switch (animation.type) {
      case 'animate':
        if (!animation.attributeName) {
          errors.push('attributeName is required for animate');
        }
        if (animation.from === undefined && animation.to === undefined && !animation.values) {
          errors.push('Either from/to or values must be specified');
        }
        break;

      case 'animateTransform':
        if (!animation.transformType) {
          errors.push('transformType is required for animateTransform');
        }
        break;

      case 'animateMotion':
        if (!animation.path && !animation.mpath) {
          errors.push('Either path or mpath is required for animateMotion');
        }
        break;

      case 'set':
        if (!animation.attributeName) {
          errors.push('attributeName is required for set');
        }
        if (animation.to === undefined) {
          errors.push('to value is required for set');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }
}
