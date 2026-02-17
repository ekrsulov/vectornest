import React, { useCallback, useMemo, useState } from 'react';
import { Badge, Box, Collapse, HStack, VStack, Text } from '@chakra-ui/react';
import { useShallow } from 'zustand/react/shallow';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { CustomSelect } from '../../ui/CustomSelect';
import { AnimationCard } from './components/AnimationCard';
import { PanelTextInput } from '../../ui/PanelTextInput';
import type { SvgStructureContributionProps } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import type { AnimationSelectValue } from '../animationSystem/animationPresets';
import { useCanvasStore } from '../../store/canvasStore';
import { getReferencedIds } from '../../utils/referenceUtils';
import type { CanvasElement, GroupElement, GroupData, Viewport } from '../../types';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import type { Bounds } from '../../utils/boundsUtils';
import { getParentCumulativeTransformMatrix } from '../../utils/elementTransformUtils';
import { inverseMatrix, applyToPoint } from '../../utils/matrixUtils';

const PRESET_OPTIONS: { value: AnimationSelectValue; label: string }[] = [
  { value: 'fadeIn', label: 'Fade in' },
  { value: 'popIn', label: 'Pop in' },
  { value: 'slideUp', label: 'Slide up' },
  { value: 'rotate', label: 'Rotate' },
  { value: 'pulseSlow', label: 'Pulse' },
  { value: 'move', label: 'Move' },
  { value: 'pathDraw', label: 'Path draw' },
];

const generateAnimationId = () => `anim-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Check if an element has its own transform (transformMatrix or legacy transform object).
 * Elements with transforms need special handling for animations that depend on center point.
 */
const elementHasTransform = (element: CanvasElement): boolean => {
  const data = element.data as Record<string, unknown>;

  // Check for transformMatrix
  if (Array.isArray(data.transformMatrix)) {
    const matrix = data.transformMatrix as number[];
    // Check if it's not an identity matrix
    const isIdentity = matrix[0] === 1 && matrix[1] === 0 &&
      matrix[2] === 0 && matrix[3] === 1 &&
      matrix[4] === 0 && matrix[5] === 0;
    if (!isIdentity) return true;
  }

  // Check for legacy transform object
  if (data.transform && typeof data.transform === 'object') {
    const t = data.transform as {
      translateX?: number; translateY?: number;
      rotation?: number; scaleX?: number; scaleY?: number
    };
    // Check if any transform property is non-default
    if ((t.rotation && t.rotation !== 0) ||
      (t.scaleX !== undefined && t.scaleX !== 1) ||
      (t.scaleY !== undefined && t.scaleY !== 1)) {
      return true;
    }
  }

  return false;
};

const DEF_CONTAINER_TAGS = new Set([
  'lineargradient',
  'radialgradient',
  'pattern',
  'mask',
  'marker',
  'filter',
  'clippath',
  'symbol',
]);

const matchesAnimationTarget = (animation: SVGAnimation, candidateId: string): boolean => {
  return (
    animation.targetElementId === candidateId ||
    animation.previewElementId === candidateId ||
    animation.clipPathTargetId === candidateId ||
    animation.gradientTargetId === candidateId ||
    animation.patternTargetId === candidateId ||
    animation.maskTargetId === candidateId ||
    animation.filterTargetId === candidateId ||
    animation.markerTargetId === candidateId
  );
};

/**
 * Matches animations that target a def element directly (not its children).
 * These are animations like animateTransform on gradientTransform or patternTransform.
 */
const matchesDefElementTarget = (animation: SVGAnimation, defId: string, tagName: string): boolean => {
  // Gradient-level animations (not on stops)
  if ((tagName === 'lineargradient' || tagName === 'radialgradient') &&
    animation.gradientTargetId === defId &&
    animation.stopIndex === undefined) {
    return true;
  }
  // Pattern-level animations (not on children)
  if (tagName === 'pattern' &&
    animation.patternTargetId === defId &&
    animation.patternChildIndex === undefined) {
    return true;
  }
  // Marker-level animations (not on children)
  if (tagName === 'marker' &&
    animation.markerTargetId === defId &&
    animation.markerChildIndex === undefined) {
    return true;
  }
  // ClipPath-level animations (not on children)
  if (tagName === 'clippath' &&
    animation.clipPathTargetId === defId &&
    animation.clipPathChildIndex === undefined) {
    return true;
  }
  // Mask-level animations (not on children)
  if (tagName === 'mask' &&
    animation.maskTargetId === defId &&
    animation.maskChildIndex === undefined) {
    return true;
  }
  // Filter-level animations (not on primitives)
  if (tagName === 'filter' &&
    animation.filterTargetId === defId &&
    animation.filterPrimitiveIndex === undefined) {
    return true;
  }
  return false;
};

/**
 * Matches animations that target a specific defs child element.
 * Defs children are identified by the owner ID + child index.
 */
const matchesDefsChildTarget = (
  animation: SVGAnimation,
  defsOwnerId: string,
  childIndex: number,
  tagName: string
): boolean => {
  // Check for gradient stop animations
  if (tagName === 'stop' && animation.gradientTargetId === defsOwnerId && animation.stopIndex === childIndex) {
    return true;
  }
  // Check for pattern child animations (paths, shapes inside patterns)
  if (animation.patternTargetId === defsOwnerId && animation.patternChildIndex === childIndex) {
    return true;
  }
  // Check for symbol child animations
  if (animation.symbolTargetId === defsOwnerId && animation.symbolChildIndex === childIndex) {
    return true;
  }
  // Check for filter primitive animations
  if (animation.filterTargetId === defsOwnerId && animation.filterPrimitiveIndex === childIndex) {
    return true;
  }
  // Check for marker child animations (paths, shapes inside markers)
  if (animation.markerTargetId === defsOwnerId && animation.markerChildIndex === childIndex) {
    return true;
  }
  // Check for clipPath child animations (rects, paths, shapes inside clipPaths)
  if (animation.clipPathTargetId === defsOwnerId && animation.clipPathChildIndex === childIndex) {
    return true;
  }
  // Check for mask child animations (rects, circles, paths inside masks)
  if (animation.maskTargetId === defsOwnerId && animation.maskChildIndex === childIndex) {
    return true;
  }
  return false;
};

/**
 * Detects the defs type based on the owner ID pattern and tag name.
 */
const detectDefsType = (defsOwnerId: string, tagName: string): 'gradient' | 'pattern' | 'symbol' | 'filter' | 'mask' | 'marker' | 'clipPath' | null => {
  if (tagName === 'stop') return 'gradient';
  // Gradient detection
  if (defsOwnerId.includes('grad') || defsOwnerId.startsWith('linear-') || defsOwnerId.startsWith('radial-') || defsOwnerId.startsWith('g_')) return 'gradient';
  // Symbol detection
  if (defsOwnerId.startsWith('symbol-') || defsOwnerId.startsWith('symbol') || defsOwnerId.includes('symbol')) return 'symbol';
  // Filter detection
  if (defsOwnerId.startsWith('filter-') || defsOwnerId.startsWith('filter') || defsOwnerId.startsWith('f_')) return 'filter';
  // Mask detection
  if (defsOwnerId.startsWith('mask-') || defsOwnerId.startsWith('mask') || defsOwnerId.startsWith('m_')) return 'mask';
  // Marker detection
  if (defsOwnerId.startsWith('marker-') || defsOwnerId.startsWith('marker') || defsOwnerId.startsWith('mk_')) return 'marker';
  // ClipPath detection
  if (defsOwnerId.startsWith('clipPath-') || defsOwnerId.startsWith('clip') || defsOwnerId.startsWith('cp_')) return 'clipPath';
  // Pattern detection
  if (defsOwnerId.startsWith('pat_') || defsOwnerId.startsWith('pattern')) return 'pattern';
  // Default to pattern for unknown defs
  return 'pattern';
};

export const AdvancedAnimationStructureContribution: React.FC<SvgStructureContributionProps<CanvasStore>> = ({ node }) => {
  // For regular elements: use dataElementId or idAttribute
  // For defs children: use defsOwnerId + childIndex
  const isDefContainerTag = DEF_CONTAINER_TAGS.has(node.tagName);
  const isDefsChild = Boolean(
    node.isDefs &&
    node.defsOwnerId &&
    node.childIndex !== undefined &&
    !isDefContainerTag
  );
  const targetId = useMemo(() => {
    if (isDefsChild) {
      // For defs children, use defsOwnerId as the target (for display purposes)
      return node.defsOwnerId ?? null;
    }
    return node.dataElementId ?? node.idAttribute ?? null;
  }, [isDefsChild, node.dataElementId, node.defsOwnerId, node.idAttribute]);
  const elements = useCanvasStore((state) => state.elements);

  // Store functions for adding/updating elements (needed for wrapping elements in groups)
  const addElement = useCanvasStore((state) => state.addElement);
  const updateElement = useCanvasStore((state) => state.updateElement);

  const { animations, addAnimation, updateAnimation, removeAnimation, createFadeAnimation, createMoveAnimation, createPathDrawAnimation } = useCanvasStore(
    useShallow((state) => {
      const slice = state as CanvasStore & AnimationPluginSlice;
      return {
        animations: slice.animations ?? [],
        addAnimation: slice.addAnimation,
        updateAnimation: slice.updateAnimation,
        removeAnimation: slice.removeAnimation,
        createFadeAnimation: slice.createFadeAnimation,
        createMoveAnimation: slice.createMoveAnimation,
        createPathDrawAnimation: slice.createPathDrawAnimation,
      };
    })
  );

  const elementMap = useMemo(() => new Map(elements.map((el) => [el.id, el])), [elements]);

  const renderTargetLabel = useCallback((animation: SVGAnimation) => {
    const text = (value: string) => (
      <Text fontSize="10px" color="text.muted" noOfLines={1}>
        {value}
      </Text>
    );
    const badge = (label: string) => (
      <Badge colorScheme="gray" fontSize="9px" px={1} py={0.25} borderRadius="sm">
        {label}
      </Badge>
    );
    const chain = (baseId: string, baseType: string, childLabel?: string, childType?: string) => (
      <HStack spacing={1} align="center" flexWrap="wrap">
        {text(baseId)}
        {badge(baseType)}
        {childLabel && (
          <>
            <Text fontSize="10px" color="text.muted">→</Text>
            {text(childLabel)}
            {badge(childType ?? 'child')}
          </>
        )}
      </HStack>
    );

    if (animation.gradientTargetId) {
      const base = animation.gradientTargetId;
      if (animation.stopIndex !== undefined) {
        return chain(base, 'gradient', `stop_${animation.stopIndex + 1}`, 'stop');
      }
      return chain(base, 'gradient');
    }

    if (animation.patternTargetId) {
      const base = animation.patternTargetId;
      if (animation.patternChildIndex !== undefined) {
        return chain(base, 'pattern', `child_${animation.patternChildIndex + 1}`, 'child');
      }
      return chain(base, 'pattern');
    }

    if (animation.symbolTargetId) {
      const base = animation.symbolTargetId;
      if (animation.symbolChildIndex !== undefined) {
        return chain(base, 'symbol', `child_${animation.symbolChildIndex + 1}`, 'child');
      }
      return chain(base, 'symbol');
    }

    if (animation.filterTargetId) {
      const base = animation.filterTargetId;
      if (animation.filterPrimitiveIndex !== undefined) {
        return chain(base, 'filter', `primitive_${animation.filterPrimitiveIndex + 1}`, 'primitive');
      }
      return chain(base, 'filter');
    }

    if (animation.markerTargetId) {
      const base = animation.markerTargetId;
      if (animation.markerChildIndex !== undefined) {
        return chain(base, 'marker', `child_${animation.markerChildIndex + 1}`, 'child');
      }
      return chain(base, 'marker');
    }

    if (animation.clipPathTargetId) {
      const base = animation.clipPathTargetId;
      if (animation.clipPathChildIndex !== undefined) {
        return chain(base, 'clipPath', `child_${animation.clipPathChildIndex + 1}`, 'child');
      }
      return chain(base, 'clipPath');
    }

    if (animation.maskTargetId) {
      const base = animation.maskTargetId;
      if (animation.maskChildIndex !== undefined) {
        return chain(base, 'mask', `child_${animation.maskChildIndex + 1}`, 'child');
      }
      return chain(base, 'mask');
    }

    const target = animation.targetElementId ?? animation.previewElementId ?? null;
    if (target) {
      const el = elementMap.get(target);
      const label = el?.type ?? 'element';
      return chain(target, label);
    }

    return null;
  }, [elementMap]);

  const collectElementTargets = useCallback(
    (element: CanvasElement | undefined, acc: Set<string>) => {
      if (!element) return;
      if (acc.has(element.id)) return;
      acc.add(element.id);

      const referenced = getReferencedIds(element) ?? [];
      referenced.forEach((id) => acc.add(id));

      if (element.type === 'group') {
        const childIds = ((element as GroupElement).data.childIds ?? []) as string[];
        childIds.forEach((childId) => {
          collectElementTargets(elementMap.get(childId), acc);
        });
      }
    },
    [elementMap]
  );

  const targetIds = useMemo(() => {
    const ids = new Set<string>();
    if (targetId) {
      const base = elementMap.get(targetId);
      if (base) {
        collectElementTargets(base, ids);
      } else {
        ids.add(targetId);
      }
    }
    return ids;
  }, [collectElementTargets, elementMap, targetId]);

  const matchingAnimations = useMemo(() => {
    if (!targetId) return [] as SVGAnimation[];

    // For defs children (elements inside a def, with a child index), match by owner ID + child index
    if (isDefsChild && node.defsOwnerId && node.childIndex !== undefined) {
      return animations.filter((anim) =>
        matchesDefsChildTarget(anim, node.defsOwnerId!, node.childIndex!, node.tagName)
      );
    }

    // For def elements themselves (gradient, pattern, etc.), match animations on the def itself
    // These are identified by isDefs=true, having idAttribute, but no childIndex
    const isDefElement = node.isDefs && node.idAttribute && isDefContainerTag;
    if (isDefElement) {
      return animations.filter((anim) =>
        matchesDefElementTarget(anim, node.idAttribute!, node.tagName)
      );
    }

    // For regular elements, match by element ID
    const idList = Array.from(targetIds);
    return animations.filter((anim) => idList.some((id) => matchesAnimationTarget(anim, id)));
  }, [animations, isDefContainerTag, isDefsChild, node.childIndex, node.defsOwnerId, node.idAttribute, node.isDefs, node.tagName, targetId, targetIds]);

  const animationCount = matchingAnimations.length;

  const [selectedPreset, setSelectedPreset] = useState<AnimationSelectValue>('fadeIn');
  const [showDetails, setShowDetails] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [customType, setCustomType] = useState<'animate' | 'animateTransform' | 'animateMotion' | 'set'>('animate');
  const [customAttribute, setCustomAttribute] = useState('opacity');
  const [customFrom, setCustomFrom] = useState('0');
  const [customTo, setCustomTo] = useState('1');
  const [customDur, setCustomDur] = useState('2s');
  const [customPath, setCustomPath] = useState('M 0 0 L 100 0');
  const [customMPath, setCustomMPath] = useState('');
  const [customRotate, setCustomRotate] = useState<'auto' | 'auto-reverse' | string>('auto');
  const [customTransformType, setCustomTransformType] = useState<'translate' | 'scale' | 'rotate' | 'skewX' | 'skewY'>('translate');

  const viewport = useCanvasStore((state) => state.viewport);

  /**
   * Get all descendant elements from an element (including the element itself).
   * Works for any element type (path, use, nativeShape, nativeText, image, group).
   */
  const getDescendantElements = useCallback(
    (id: string): CanvasElement[] => {
      const el = elementMap.get(id);
      if (!el) return [];
      if (el.type === 'group') {
        const childIds = (el.data as GroupElement['data']).childIds ?? [];
        return childIds.flatMap((childId) => getDescendantElements(childId));
      }
      return [el];
    },
    [elementMap]
  );

  /**
   * Get only path elements from an element (for pathDraw animation).
   */
  const getElementPaths = useCallback(
    (id: string): CanvasElement[] => {
      const el = elementMap.get(id);
      if (!el) return [];
      if (el.type === 'path') return [el];
      if (el.type === 'group') {
        const childIds = (el.data as GroupElement['data']).childIds ?? [];
        return childIds.flatMap((childId) => getElementPaths(childId));
      }
      return [];
    },
    [elementMap]
  );

  /**
   * Calculate bounds from a list of elements using elementContributionRegistry.
   * Works for any element type (path, use, nativeShape, nativeText, image, etc.).
   */
  const calculateBoundsFromElements = useCallback(
    (elems: CanvasElement[], vp: Viewport): { centerX: number; centerY: number } | null => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let hasBounds = false;

      for (const el of elems) {
        const bounds: Bounds | null = elementContributionRegistry.getBounds(el, { viewport: vp, elementMap });
        if (bounds) {
          minX = Math.min(minX, bounds.minX);
          minY = Math.min(minY, bounds.minY);
          maxX = Math.max(maxX, bounds.maxX);
          maxY = Math.max(maxY, bounds.maxY);
          hasBounds = true;
        }
      }

      if (!hasBounds) return null;

      return {
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      };
    },
    [elementMap]
  );

  /**
   * Wrap a single element in a group. This is used when an element has its own transform
   * and we need to apply animations (like rotation) at the group level to ensure the
   * animation works correctly with the element's center.
   * 
   * Returns the wrapper group's ID, or null if wrapping failed.
   */
  const wrapElementInGroup = useCallback(
    (elementId: string): string | null => {
      const element = elementMap.get(elementId);
      if (!element || element.type === 'group' || !addElement || !updateElement) {
        return null;
      }

      // Create a wrapper group with the element as its only child
      const wrapperGroupData: GroupData = {
        childIds: [elementId],
        name: `Animation Wrapper`,
        isLocked: false,
        isHidden: false,
        isExpanded: true,
        transform: {
          translateX: 0,
          translateY: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      };

      // Find the element's current zIndex and parentId
      const parentId = element.parentId;

      // Create the wrapper group - addElement returns the generated ID
      const wrapperGroupId = addElement({
        type: 'group',
        parentId,
        data: wrapperGroupData,
      });

      // Update the original element to have the wrapper group as its parent
      updateElement(elementId, { parentId: wrapperGroupId });

      // If the element was part of a parent group, update the parent's childIds
      if (parentId) {
        const parentElement = elementMap.get(parentId);
        if (parentElement && parentElement.type === 'group') {
          const parentData = parentElement.data as GroupData;
          const newChildIds = parentData.childIds.map(id =>
            id === elementId ? wrapperGroupId : id
          );
          updateElement(parentId, {
            data: { ...parentData, childIds: newChildIds }
          });
        }
      }

      return wrapperGroupId;
    },
    [elementMap, addElement, updateElement]
  );

  const applyPreset = useCallback(
    (preset: AnimationSelectValue) => {
      if (!targetId) return;

      const applyFadeIn = () => {
        createFadeAnimation?.(targetId, '2s', 0, 1);
      };

      const applyMove = () => {
        // Check if the target element has its own transform
        // If so, wrap it in a group to ensure animations work correctly
        const targetElement = elementMap.get(targetId);
        let animationTargetId = targetId;

        if (targetElement && targetElement.type !== 'group' && elementHasTransform(targetElement)) {
          const wrapperId = wrapElementInGroup(targetId);
          if (wrapperId) {
            animationTargetId = wrapperId;
          }
        }

        createMoveAnimation?.(animationTargetId);
      };

      const applyPathDraw = () => {
        const paths = getElementPaths(targetId);
        if (paths.length === 0) {
          createPathDrawAnimation?.(targetId);
          return;
        }
        paths.forEach((p) => createPathDrawAnimation?.(p.id));
      };

      const applyRotate = () => {
        const elements = getDescendantElements(targetId);
        if (elements.length === 0) return;

        // Check if the target element has its own transform
        // If so, wrap it in a group to ensure animations work correctly
        const targetElement = elementMap.get(targetId);
        let animationTargetId = targetId;
        let wrapperId: string | null = null;

        if (targetElement && targetElement.type !== 'group' && elementHasTransform(targetElement)) {
          wrapperId = wrapElementInGroup(targetId);
          if (wrapperId) {
            animationTargetId = wrapperId;
          }
        }

        // Calculate global bounds first
        const bounds = calculateBoundsFromElements(elements, viewport);
        if (!bounds) return;

        // If we wrapped the element, transform the center to local coordinates
        let cx = bounds.centerX;
        let cy = bounds.centerY;

        if (wrapperId && targetElement) {
          // Get the parent's accumulated transform matrix (wrapper group is now inside the parent)
          // We need to transform global coordinates to the parent's local coordinate space
          const parentMatrix = getParentCumulativeTransformMatrix(targetElement, [...useCanvasStore.getState().elements]);
          const invParent = inverseMatrix(parentMatrix);
          if (invParent) {
            const localCenter = applyToPoint(invParent, { x: cx, y: cy });
            cx = localCenter.x;
            cy = localCenter.y;
          }
        }

        cx = Math.round(cx);
        cy = Math.round(cy);

        addAnimation?.({
          id: generateAnimationId(),
          type: 'animateTransform',
          attributeName: 'transform',
          transformType: 'rotate',
          targetElementId: animationTargetId,
          dur: '2s',
          from: `0 ${cx} ${cy}`,
          to: `360 ${cx} ${cy}`,
          repeatCount: 1,
          additive: 'sum',
        });
      };

      const applyPulse = () => {
        const elements = getDescendantElements(targetId);
        if (elements.length === 0) return;

        // Check if the target element has its own transform
        // If so, wrap it in a group to ensure animations work correctly
        const targetElement = elementMap.get(targetId);
        let animationTargetId = targetId;
        let wrapperId: string | null = null;

        if (targetElement && targetElement.type !== 'group' && elementHasTransform(targetElement)) {
          wrapperId = wrapElementInGroup(targetId);
          if (wrapperId) {
            animationTargetId = wrapperId;
          }
        }

        // Calculate global bounds first
        const bounds = calculateBoundsFromElements(elements, viewport);
        if (!bounds) return;

        // If we wrapped the element, transform the center to local coordinates
        let cx = bounds.centerX;
        let cy = bounds.centerY;

        if (wrapperId && targetElement) {
          const parentMatrix = getParentCumulativeTransformMatrix(targetElement, [...useCanvasStore.getState().elements]);
          const invParent = inverseMatrix(parentMatrix);
          if (invParent) {
            const localCenter = applyToPoint(invParent, { x: cx, y: cy });
            cx = localCenter.x;
            cy = localCenter.y;
          }
        }

        cx = Math.round(cx);
        cy = Math.round(cy);

        const s = 1.2;
        const tx = Math.round(cx * (1 - s));
        const ty = Math.round(cy * (1 - s));
        const dur = '1s';

        addAnimation?.({
          id: generateAnimationId(),
          type: 'animateTransform',
          attributeName: 'transform',
          transformType: 'translate',
          targetElementId: animationTargetId,
          dur,
          values: `0 0; ${tx} ${ty}; 0 0`,
          repeatCount: 1,
          additive: 'sum',
        });

        addAnimation?.({
          id: generateAnimationId(),
          type: 'animateTransform',
          attributeName: 'transform',
          transformType: 'scale',
          targetElementId: animationTargetId,
          dur,
          values: '1 1; 1.2 1.2; 1 1',
          repeatCount: 1,
          additive: 'sum',
        });
      };

      const applyPopIn = () => {
        const elements = getDescendantElements(targetId);
        if (elements.length === 0) return;

        // Check if the target element has its own transform
        // If so, wrap it in a group to ensure animations work correctly
        const targetElement = elementMap.get(targetId);
        let animationTargetId = targetId;
        let wrapperId: string | null = null;

        if (targetElement && targetElement.type !== 'group' && elementHasTransform(targetElement)) {
          wrapperId = wrapElementInGroup(targetId);
          if (wrapperId) {
            animationTargetId = wrapperId;
          }
        }

        // Calculate global bounds first
        const bounds = calculateBoundsFromElements(elements, viewport);
        if (!bounds) return;

        // If we wrapped the element, transform the center to local coordinates
        let cx = bounds.centerX;
        let cy = bounds.centerY;

        if (wrapperId && targetElement) {
          const parentMatrix = getParentCumulativeTransformMatrix(targetElement, [...useCanvasStore.getState().elements]);
          const invParent = inverseMatrix(parentMatrix);
          if (invParent) {
            const localCenter = applyToPoint(invParent, { x: cx, y: cy });
            cx = localCenter.x;
            cy = localCenter.y;
          }
        }

        cx = Math.round(cx);
        cy = Math.round(cy);

        const s1 = 0.8;
        const s2 = 1.05;
        const tx1 = Math.round(cx * (1 - s1));
        const ty1 = Math.round(cy * (1 - s1));
        const tx2 = Math.round(cx * (1 - s2));
        const ty2 = Math.round(cy * (1 - s2));

        addAnimation?.({
          id: generateAnimationId(),
          type: 'animateTransform',
          attributeName: 'transform',
          transformType: 'translate',
          targetElementId: animationTargetId,
          dur: '0.7s',
          values: `${tx1} ${ty1}; ${tx2} ${ty2}; 0 0`,
          repeatCount: 1,
          additive: 'sum',
        });

        addAnimation?.({
          id: generateAnimationId(),
          type: 'animateTransform',
          attributeName: 'transform',
          transformType: 'scale',
          targetElementId: animationTargetId,
          dur: '0.7s',
          values: `${s1} ${s1}; ${s2} ${s2}; 1 1`,
          repeatCount: 1,
          additive: 'sum',
        });
      };

      const applySlideUp = () => {
        // Check if the target element has its own transform
        // If so, wrap it in a group to ensure animations work correctly
        const targetElement = elementMap.get(targetId);
        let animationTargetId = targetId;

        if (targetElement && targetElement.type !== 'group' && elementHasTransform(targetElement)) {
          const wrapperId = wrapElementInGroup(targetId);
          if (wrapperId) {
            animationTargetId = wrapperId;
          }
        }

        addAnimation?.({
          id: generateAnimationId(),
          type: 'animateTransform',
          attributeName: 'transform',
          transformType: 'translate',
          targetElementId: animationTargetId,
          dur: '0.8s',
          values: '0 16; 0 0',
          repeatCount: 1,
          additive: 'sum',
        });
      };

      switch (preset) {
        case 'fadeIn':
          applyFadeIn();
          break;
        case 'move':
          applyMove();
          break;
        case 'pathDraw':
          applyPathDraw();
          break;
        case 'rotate':
          applyRotate();
          break;
        case 'pulseSlow':
          applyPulse();
          break;
        case 'popIn':
          applyPopIn();
          break;
        case 'slideUp':
          applySlideUp();
          break;
        default:
          break;
      }

      setShowDetails(true);
      setShowPresetPicker(false);
    },
    [addAnimation, calculateBoundsFromElements, createFadeAnimation, createMoveAnimation, createPathDrawAnimation, elementMap, getDescendantElements, getElementPaths, targetId, viewport, wrapElementInGroup]
  );

  const handleConfirmPreset = useCallback(() => {
    applyPreset(selectedPreset);
  }, [applyPreset, selectedPreset]);

  const motionPathOptions = useMemo(
    () => [
      { value: '', label: 'Inline path' },
      ...elements
        .filter((el) => el.type === 'path' || el.type === 'nativeShape')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((el) => ({ value: el.id, label: (el.data as any).name || el.id })),
    ],
    [elements]
  );

  const handleAddCustomAnimation = useCallback(() => {
    if (!targetId || !addAnimation) return;

    // Build base animation with appropriate target IDs for defs children
    const base: Partial<SVGAnimation> = {
      id: generateAnimationId(),
      targetElementId: targetId,
      dur: customDur || '2s',
      repeatCount: 1,
      fill: 'freeze' as const,
      begin: '0s',
    };

    // Add defs-specific target IDs if this is a defs child
    if (isDefsChild && node.defsOwnerId && node.childIndex !== undefined) {
      const defsType = detectDefsType(node.defsOwnerId, node.tagName);
      switch (defsType) {
        case 'gradient':
          base.gradientTargetId = node.defsOwnerId;
          base.stopIndex = node.childIndex;
          break;
        case 'pattern':
          base.patternTargetId = node.defsOwnerId;
          base.patternChildIndex = node.childIndex;
          break;
        case 'symbol':
          base.symbolTargetId = node.defsOwnerId;
          base.symbolChildIndex = node.childIndex;
          break;
        case 'filter':
          base.filterTargetId = node.defsOwnerId;
          base.filterPrimitiveIndex = node.childIndex;
          break;
        case 'mask':
          base.maskTargetId = node.defsOwnerId;
          base.maskChildIndex = node.childIndex;
          break;
        case 'marker':
          base.markerTargetId = node.defsOwnerId;
          base.markerChildIndex = node.childIndex;
          break;
        case 'clipPath':
          base.clipPathTargetId = node.defsOwnerId;
          base.clipPathChildIndex = node.childIndex;
          break;
      }
    }

    const payload = (() => {
      if (customType === 'animate') {
        return {
          ...base,
          type: 'animate' as const,
          attributeName: customAttribute || 'opacity',
          from: customFrom,
          to: customTo,
        };
      }
      if (customType === 'animateTransform') {
        return {
          ...base,
          type: 'animateTransform' as const,
          attributeName: customAttribute || 'transform',
          transformType: customTransformType,
          from: customFrom,
          to: customTo,
        };
      }
      if (customType === 'animateMotion') {
        return {
          ...base,
          type: 'animateMotion' as const,
          path: customMPath ? undefined : customPath,
          mpath: customMPath || undefined,
          rotate: customRotate,
        };
      }
      return {
        ...base,
        type: 'set' as const,
        attributeName: customAttribute || 'opacity',
        to: customTo,
      };
    })();

    addAnimation(payload as SVGAnimation);
    setShowDetails(true);
  }, [addAnimation, customAttribute, customDur, customFrom, customMPath, customPath, customRotate, customTo, customTransformType, customType, isDefsChild, node.childIndex, node.defsOwnerId, node.tagName, targetId]);

  const handleDelete = useCallback(
    (id: string) => {
      removeAnimation?.(id);
    },
    [removeAnimation]
  );

  const handleDeleteAll = useCallback(() => {
    if (!removeAnimation) return;
    matchingAnimations.forEach((anim) => removeAnimation(anim.id));
    setShowDetails(false);
  }, [matchingAnimations, removeAnimation]);

  const handleUpdate = useCallback(
    (id: string, updates: Partial<SVGAnimation>) => {
      updateAnimation?.(id, updates);
    },
    [updateAnimation]
  );

  const canAdd = Boolean(targetId);

  return (
    <VStack spacing={0.5} align="stretch">
      <VStack spacing={0.5} align="stretch">
        <HStack spacing={1} align="center">
          <PanelStyledButton
            size="xs"
            onClick={() => setShowPresetPicker((open) => !open)}
            isDisabled={!canAdd}
          >
            + Anim
          </PanelStyledButton>
          <PanelStyledButton
            size="xs"
            variant="ghost"
            onClick={() => setShowCustomCreator((open) => !open)}
            isDisabled={!canAdd}
          >
            Custom
          </PanelStyledButton>
          {animationCount > 0 && (
            <Badge
              colorScheme="blue"
              borderRadius="md"
              cursor="pointer"
              onClick={() => setShowDetails((open) => !open)}
            >
              {animationCount} animation{animationCount === 1 ? '' : 's'}
            </Badge>
          )}
          {animationCount > 0 && (
            <PanelStyledButton size="xs" variant="ghost" onClick={handleDeleteAll}>
              Clear
            </PanelStyledButton>
          )}
        </HStack>

        <Collapse in={showPresetPicker} animateOpacity>
          <HStack spacing={1} align="center" pt={1}>
            <CustomSelect
              value={selectedPreset}
              onChange={(value) => setSelectedPreset(value as AnimationSelectValue)}
              options={PRESET_OPTIONS}
              size="sm"
              aria-label="Select animation preset"
            />
            <PanelStyledButton size="xs" onClick={handleConfirmPreset} isDisabled={!addAnimation}>
              Confirm
            </PanelStyledButton>
          </HStack>
        </Collapse>

        <Collapse in={showCustomCreator} animateOpacity>
          <VStack spacing={1} align="stretch" pt={1}>
            <CustomSelect
              value={customType}
              onChange={(val) => setCustomType(val as typeof customType)}
              options={[
                { value: 'animate', label: 'animate' },
                { value: 'animateTransform', label: 'animateTransform' },
                { value: 'animateMotion', label: 'animateMotion' },
                { value: 'set', label: 'set' },
              ]}
              size="sm"
              aria-label="Animation type"
            />

            {(customType === 'animate' || customType === 'animateTransform' || customType === 'set') && (
              <Box pl={0.5} pr={0.5} w="full">
                <PanelTextInput
                  value={customAttribute}
                  onChange={setCustomAttribute}
                  placeholder="attributeName"
                  width="100%"
                />
              </Box>
            )}

            {(customType === 'animate' || customType === 'animateTransform') && (
              <HStack spacing={1}>
                <Box w="50%" pl={0.5}>
                  <PanelTextInput value={customFrom} onChange={setCustomFrom} placeholder="from" width="100%" />
                </Box>
                <Box w="50%" pr={0.5}>
                  <PanelTextInput value={customTo} onChange={setCustomTo} placeholder="to" width="100%" />
                </Box>
              </HStack>
            )}

            {customType === 'set' && (
              <Box pr={0.5} w="full">
                <PanelTextInput value={customTo} onChange={setCustomTo} placeholder="to" width="100%" />
              </Box>
            )}

            {customType === 'animateTransform' && (
              <CustomSelect
                value={customTransformType}
                onChange={(val) => setCustomTransformType(val as typeof customTransformType)}
                options={[
                  { value: 'translate', label: 'translate' },
                  { value: 'scale', label: 'scale' },
                  { value: 'rotate', label: 'rotate' },
                  { value: 'skewX', label: 'skewX' },
                  { value: 'skewY', label: 'skewY' },
                ]}
                size="sm"
                aria-label="Transform type"
              />
            )}

            {customType === 'animateMotion' && (
              <VStack spacing={1} align="stretch">
                <CustomSelect
                  value={customMPath}
                  onChange={setCustomMPath}
                  options={motionPathOptions}
                  size="sm"
                  aria-label="Motion path reference"
                />
                {!customMPath && (
                  <PanelTextInput
                    value={customPath}
                    onChange={setCustomPath}
                    placeholder="M 0 0 L 100 0"
                    width="100%"
                  />
                )}
                <CustomSelect
                  value={String(customRotate)}
                  onChange={(val) => setCustomRotate(val)}
                  options={[
                    { value: 'auto', label: 'auto' },
                    { value: 'auto-reverse', label: 'auto-reverse' },
                    { value: '0', label: '0°' },
                    { value: '90', label: '90°' },
                    { value: '180', label: '180°' },
                    { value: '270', label: '270°' },
                  ]}
                  size="sm"
                  aria-label="Rotation"
                />
              </VStack>
            )}

            <Box pl={0.5} pr={0.5} w="full">
              <PanelTextInput
                value={customDur}
                onChange={setCustomDur}
                placeholder="Duration (e.g. 2s)"
                width="100%"
              />
            </Box>

            <PanelStyledButton size="xs" onClick={handleAddCustomAnimation} isDisabled={!addAnimation || !canAdd}>
              Add custom animation
            </PanelStyledButton>
          </VStack>
        </Collapse>
      </VStack>

      <Collapse in={showDetails && matchingAnimations.length > 0} animateOpacity>
        <VStack spacing={1} align="stretch" pt={1}>
          {matchingAnimations.map((animation) => {
            const targetLabel = renderTargetLabel(animation);
            return (
              <AnimationCard
                key={animation.id}
                animation={animation}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                targetLabel={targetLabel}
              />
            );
          })}
        </VStack>
      </Collapse>
    </VStack>
  );
};

export const AdvancedAnimationStructureBadges: React.FC<SvgStructureContributionProps<CanvasStore>> = ({ node }) => {
  const isDefContainerTag = DEF_CONTAINER_TAGS.has(node.tagName);
  const isDefsChild = Boolean(
    node.isDefs &&
    node.defsOwnerId &&
    node.childIndex !== undefined &&
    !isDefContainerTag
  );
  const targetId = useMemo(() => {
    if (isDefsChild) {
      return node.defsOwnerId ?? null;
    }
    return node.dataElementId ?? node.idAttribute ?? null;
  }, [isDefsChild, node.dataElementId, node.defsOwnerId, node.idAttribute]);

  const defsOwnerId = node.defsOwnerId ?? null;
  const childIndex = node.childIndex;
  const tagName = node.tagName;
  const isDefElement = node.isDefs && node.idAttribute && isDefContainerTag;
  const idAttribute = node.idAttribute ?? null;

  const [directCount, indirectCount] = useCanvasStore(
    useShallow((state) => {
      const { animations = [] } = state as CanvasStore & AnimationPluginSlice;

      if (!targetId) return [0, 0] as const;

      if (isDefsChild && defsOwnerId && childIndex !== undefined) {
        let total = 0;
        for (const anim of animations) {
          if (matchesDefsChildTarget(anim, defsOwnerId, childIndex, tagName)) {
            total += 1;
          }
        }
        return [total, 0] as const;
      }

      if (isDefElement && idAttribute) {
        let total = 0;
        for (const anim of animations) {
          if (matchesDefElementTarget(anim, idAttribute, tagName)) {
            total += 1;
          }
        }
        return [total, 0] as const;
      }

      // Regular elements: split between direct (element animations) and indirect (defs used by element).
      let direct = 0;
      let indirect = 0;

      const elements = (state as CanvasStore).elements ?? [];
      const element = elements.find((el) => el.id === targetId);
      const referencedIds = element ? getReferencedIds(element) : [];
      const referencedIdSet = new Set(referencedIds);

      for (const anim of animations) {
        if (anim.targetElementId === targetId) {
          direct += 1;
          continue;
        }

        const matchesReferencedTarget =
          referencedIdSet.has(anim.targetElementId) ||
          (anim.gradientTargetId ? referencedIdSet.has(anim.gradientTargetId) : false) ||
          (anim.patternTargetId ? referencedIdSet.has(anim.patternTargetId) : false) ||
          (anim.clipPathTargetId ? referencedIdSet.has(anim.clipPathTargetId) : false) ||
          (anim.filterTargetId ? referencedIdSet.has(anim.filterTargetId) : false) ||
          (anim.maskTargetId ? referencedIdSet.has(anim.maskTargetId) : false) ||
          (anim.markerTargetId ? referencedIdSet.has(anim.markerTargetId) : false) ||
          (anim.symbolTargetId ? referencedIdSet.has(anim.symbolTargetId) : false);

        if (matchesReferencedTarget) {
          indirect += 1;
          continue;
        }

        const isTransitive = Boolean(
          anim.gradientTargetId ||
          anim.patternTargetId ||
          anim.clipPathTargetId ||
          anim.filterTargetId ||
          anim.maskTargetId ||
          anim.markerTargetId ||
          anim.symbolTargetId
        );

        if (isTransitive && anim.previewElementId === targetId) {
          indirect += 1;
        }
      }

      return [direct, indirect] as const;
    })
  );

  if (!targetId || directCount + indirectCount === 0) return null;

  return (
    <Badge colorScheme="blue" fontSize="9px" px={1} py={0.5} borderRadius="sm">
      {!node.isDefs && indirectCount > 0
        ? directCount > 0
          ? `${directCount} → ${indirectCount}`
          : `→${indirectCount}`
        : directCount}
    </Badge>
  );
};
