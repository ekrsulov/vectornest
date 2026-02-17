/**
 * Animation Gizmo System Tests
 * 
 * Tests for the gizmo registry, engine, and compiler infrastructure.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnimationGizmoRegistry } from '../registry/GizmoRegistry';
import { AnimationEngine } from '../../simulation/AnimationEngine';
import { SMILCompiler } from '../../compiler/SMILCompiler';
import type { AnimationGizmoDefinition } from '../types';
import type { SVGAnimation } from '../../types';
import type { CanvasElement } from '../../../../types';

// =============================================================================
// Mock Data
// =============================================================================

const mockElement: CanvasElement = {
  id: 'test-element-1',
  type: 'path',
  parentId: null,
  zIndex: 0,
  data: {
    subPaths: [[{ type: 'M', position: { x: 0, y: 0 } }, { type: 'L', position: { x: 100, y: 100 } }]],
    strokeWidth: 2,
    strokeColor: '#000000',
    strokeOpacity: 1,
    fillColor: 'none',
    fillOpacity: 1,
  },
};

const mockRotateAnimation: SVGAnimation = {
  id: 'anim-rotate-1',
  type: 'animateTransform',
  targetElementId: 'test-element-1',
  transformType: 'rotate',
  from: '0 50 50',
  to: '360 50 50',
  dur: '2s',
  repeatCount: 1,
  fill: 'freeze',
};

const mockTranslateAnimation: SVGAnimation = {
  id: 'anim-translate-1',
  type: 'animateTransform',
  targetElementId: 'test-element-1',
  transformType: 'translate',
  from: '0 0',
  to: '100 50',
  dur: '1s',
  fill: 'freeze',
};

const mockOpacityAnimation: SVGAnimation = {
  id: 'anim-opacity-1',
  type: 'animate',
  targetElementId: 'test-element-1',
  attributeName: 'opacity',
  from: 1,
  to: 0,
  dur: '1s',
  fill: 'freeze',
};

const createMockGizmoDefinition = (id: string, type: string): AnimationGizmoDefinition => ({
  id,
  category: 'transform',
  label: `Test ${id}`,
  description: `Test gizmo for ${id}`,
  smilTarget: 'animateTransform',
  targetAttributes: ['transform'],
  appliesTo: (anim) => anim.type === 'animateTransform' && anim.transformType === type,
  handles: [],
  visual: {
    render: () => null,
  },
  fromAnimation: (anim, elem) => ({
    gizmoId: id,
    animationId: anim.id,
    elementId: elem.id,
    props: {},
    interaction: { activeHandle: null, isDragging: false, dragStart: null, isHovered: false, hoveredHandle: null },
  }),
  toAnimation: () => ({ type: 'animateTransform', transformType: type as SVGAnimation['transformType'] }),
});

// =============================================================================
// GizmoRegistry Tests
// =============================================================================

describe('AnimationGizmoRegistry', () => {
  let registry: AnimationGizmoRegistry;

  beforeEach(() => {
    registry = new AnimationGizmoRegistry();
  });

  describe('registration', () => {
    it('should register a gizmo definition', () => {
      const gizmo = createMockGizmoDefinition('rotate', 'rotate');
      registry.register(gizmo);
      
      expect(registry.has('rotate')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should register multiple gizmos at once', () => {
      const gizmos = [
        createMockGizmoDefinition('rotate', 'rotate'),
        createMockGizmoDefinition('translate', 'translate'),
        createMockGizmoDefinition('scale', 'scale'),
      ];
      registry.registerAll(gizmos);
      
      expect(registry.size).toBe(3);
    });

    it('should replace existing gizmo with same id', () => {
      const gizmo1 = createMockGizmoDefinition('rotate', 'rotate');
      const gizmo2 = { ...createMockGizmoDefinition('rotate', 'rotate'), label: 'Updated Rotate' };
      
      registry.register(gizmo1);
      registry.register(gizmo2);
      
      expect(registry.size).toBe(1);
      expect(registry.get('rotate')?.label).toBe('Updated Rotate');
    });

    it('should unregister a gizmo', () => {
      const gizmo = createMockGizmoDefinition('rotate', 'rotate');
      registry.register(gizmo);
      
      const result = registry.unregister('rotate');
      
      expect(result).toBe(true);
      expect(registry.has('rotate')).toBe(false);
      expect(registry.size).toBe(0);
    });

    it('should return false when unregistering non-existent gizmo', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('querying', () => {
    beforeEach(() => {
      registry.registerAll([
        createMockGizmoDefinition('rotate', 'rotate'),
        createMockGizmoDefinition('translate', 'translate'),
        createMockGizmoDefinition('scale', 'scale'),
      ]);
    });

    it('should get gizmo by id', () => {
      const gizmo = registry.get('rotate');
      expect(gizmo?.id).toBe('rotate');
    });

    it('should return undefined for non-existent id', () => {
      const gizmo = registry.get('non-existent');
      expect(gizmo).toBeUndefined();
    });

    it('should get all gizmos', () => {
      const all = registry.getAll();
      expect(all.length).toBe(3);
    });

    it('should get gizmos by category', () => {
      const transformGizmos = registry.getByCategory('transform');
      expect(transformGizmos.length).toBe(3);
    });

    it('should find gizmo for animation', () => {
      const gizmo = registry.findForAnimation(mockRotateAnimation, mockElement);
      expect(gizmo?.id).toBe('rotate');
    });

    it('should return undefined if no gizmo matches', () => {
      const gizmo = registry.findForAnimation(mockOpacityAnimation, mockElement);
      expect(gizmo).toBeUndefined();
    });
  });

  describe('subscriptions', () => {
    it('should notify listeners on registration', () => {
      let notified = false;
      registry.subscribe(() => { notified = true; });
      
      registry.register(createMockGizmoDefinition('rotate', 'rotate'));
      
      expect(notified).toBe(true);
    });

    it('should allow unsubscribing', () => {
      let count = 0;
      const unsubscribe = registry.subscribe(() => { count++; });
      
      registry.register(createMockGizmoDefinition('rotate', 'rotate'));
      expect(count).toBe(1);
      
      unsubscribe();
      registry.register(createMockGizmoDefinition('translate', 'translate'));
      expect(count).toBe(1);
    });
  });
});

// =============================================================================
// AnimationEngine Tests
// =============================================================================

describe('AnimationEngine', () => {
  let engine: AnimationEngine;

  beforeEach(() => {
    engine = new AnimationEngine();
    engine.setData([mockRotateAnimation, mockTranslateAnimation], [mockElement]);
  });

  afterEach(() => {
    engine.dispose();
  });

  describe('state calculation', () => {
    it('should calculate element state at time 0', () => {
      const state = engine.calculateElementState(
        mockElement,
        [mockRotateAnimation],
        0
      );
      
      expect(state.elementId).toBe(mockElement.id);
      expect(state.time).toBe(0);
      expect(state.transform?.rotate).toBe(0);
    });

    it('should calculate element state at midpoint', () => {
      const state = engine.calculateElementState(
        mockElement,
        [mockRotateAnimation],
        1 // 1 second is halfway through 2s animation
      );
      
      expect(state.transform?.rotate).toBeCloseTo(180, 0);
    });

    it('should calculate element state at end', () => {
      const state = engine.calculateElementState(
        mockElement,
        [mockRotateAnimation],
        2
      );
      
      expect(state.transform?.rotate).toBeCloseTo(360, 0);
    });

    it('should calculate all states', () => {
      const states = engine.calculateAllStates(1);
      
      expect(states.size).toBe(1);
      expect(states.has(mockElement.id)).toBe(true);
    });
  });

  describe('playback control', () => {
    it('should start in stopped state', () => {
      expect(engine.getIsPlaying()).toBe(false);
      expect(engine.getCurrentTime()).toBe(0);
    });

    it('should seek to specific time', () => {
      engine.seekTo(1.5);
      expect(engine.getCurrentTime()).toBe(1.5);
    });

    it('should stop and reset time', () => {
      engine.seekTo(1);
      engine.stop();
      expect(engine.getCurrentTime()).toBe(0);
      expect(engine.getIsPlaying()).toBe(false);
    });
  });

  describe('quality modes', () => {
    it('should default to editing quality', () => {
      expect(engine.getQuality().mode).toBe('editing');
    });

    it('should change quality mode', () => {
      engine.setQuality('preview');
      expect(engine.getQuality().mode).toBe('preview');
    });
  });
});

// =============================================================================
// SMILCompiler Tests
// =============================================================================

describe('SMILCompiler', () => {
  let compiler: SMILCompiler;

  beforeEach(() => {
    compiler = new SMILCompiler();
  });

  describe('animate compilation', () => {
    it('should compile opacity animation', () => {
      const result = compiler.compile(mockOpacityAnimation);
      
      expect(result).toContain('<animate');
      expect(result).toContain('attributeName="opacity"');
      expect(result).toContain('from="1"');
      expect(result).toContain('to="0"');
      expect(result).toContain('dur="1s"');
    });
  });

  describe('animateTransform compilation', () => {
    it('should compile rotate animation', () => {
      const result = compiler.compile(mockRotateAnimation);
      
      expect(result).toContain('<animateTransform');
      expect(result).toContain('type="rotate"');
      expect(result).toContain('from="0 50 50"');
      expect(result).toContain('to="360 50 50"');
    });

    it('should compile translate animation', () => {
      const result = compiler.compile(mockTranslateAnimation);
      
      expect(result).toContain('<animateTransform');
      expect(result).toContain('type="translate"');
      expect(result).toContain('from="0 0"');
      expect(result).toContain('to="100 50"');
    });
  });

  describe('animateMotion compilation', () => {
    it('should compile motion path animation', () => {
      const motionAnim: SVGAnimation = {
        id: 'anim-motion-1',
        type: 'animateMotion',
        targetElementId: 'test-element-1',
        path: 'M 0 0 L 100 100',
        rotate: 'auto',
        dur: '2s',
      };
      
      const result = compiler.compile(motionAnim);
      
      expect(result).toContain('<animateMotion');
      expect(result).toContain('path="M 0 0 L 100 100"');
      expect(result).toContain('rotate="auto"');
    });

    it('should compile motion with mpath', () => {
      const motionAnim: SVGAnimation = {
        id: 'anim-motion-2',
        type: 'animateMotion',
        targetElementId: 'test-element-1',
        mpath: 'motion-path-1',
        dur: '2s',
      };
      
      const result = compiler.compile(motionAnim);
      
      expect(result).toContain('<animateMotion');
      expect(result).toContain('<mpath href="#motion-path-1"/>');
    });
  });

  describe('set compilation', () => {
    it('should compile set animation', () => {
      const setAnim: SVGAnimation = {
        id: 'anim-set-1',
        type: 'set',
        targetElementId: 'test-element-1',
        attributeName: 'visibility',
        to: 'hidden',
        begin: '2s',
      };
      
      const result = compiler.compile(setAnim);
      
      expect(result).toContain('<set');
      expect(result).toContain('attributeName="visibility"');
      expect(result).toContain('to="hidden"');
      expect(result).toContain('begin="2s"');
    });
  });

  describe('batch compilation', () => {
    it('should compile multiple animations', () => {
      const result = compiler.compileAll([
        mockRotateAnimation,
        mockTranslateAnimation,
        mockOpacityAnimation,
      ]);
      
      expect(result.elements.length).toBe(3);
      expect(result.warnings.length).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate valid animation', () => {
      const result = compiler.validate(mockRotateAnimation);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing type', () => {
      const invalid = { ...mockRotateAnimation, type: undefined as unknown as 'animateTransform' };
      const result = compiler.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Animation type is required');
    });

    it('should detect missing attributeName for animate', () => {
      const invalid = { ...mockOpacityAnimation, attributeName: undefined };
      const result = compiler.validate(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('attributeName is required for animate');
    });

    it('should detect missing values for animate', () => {
      const invalid = { ...mockOpacityAnimation, from: undefined, to: undefined };
      const result = compiler.validate(invalid);
      expect(result.valid).toBe(false);
    });
  });

  describe('precision options', () => {
    it('should round values to specified precision', () => {
      const anim: SVGAnimation = {
        id: 'anim-precise',
        type: 'animate',
        targetElementId: 'test-element-1',
        attributeName: 'x',
        from: 0.123456789,
        to: 100.987654321,
        dur: '1s',
      };
      
      const result = compiler.compile(anim, { precision: 2 });
      
      expect(result).toContain('from="0.12"');
      expect(result).toContain('to="100.99"');
    });
  });
});
