import React, { useCallback, useMemo, useState } from 'react';
import { Badge, Box, Collapse, HStack, VStack, Text } from '@chakra-ui/react';
import { useShallow } from 'zustand/react/shallow';
import { shallow } from 'zustand/shallow';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { CustomSelect } from '../../ui/CustomSelect';
import { AnimationCard } from './components/AnimationCard';
import { PanelTextInput } from '../../ui/PanelTextInput';
import type { SvgStructureContributionProps } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { AnimationPluginSlice, SVGAnimation } from '../animationSystem/types';
import { useCanvasStore, canvasStoreApi } from '../../store/canvasStore';
import type { CanvasElement, GroupElement, GroupData, Viewport } from '../../types';
import { elementContributionRegistry } from '../../utils/elementContributionRegistry';
import type { Bounds } from '../../utils/boundsUtils';
import { getParentCumulativeTransformMatrix } from '../../utils/elementTransformUtils';
import { inverseMatrix, applyToPoint } from '../../utils/matrixUtils';
import { useFrozenCanvasStoreValueDuringDrag } from '../../hooks/useFrozenElementsDuringDrag';
import { getReferencedIds } from '../../utils/referenceUtils';
import type { AnimationSelectValue } from '../animationSystem/animationPresets';
import {
  PRESET_OPTIONS,
  generateAnimationId,
  DEF_CONTAINER_TAGS,
  elementHasTransform,
  detectDefsType,
  matchesAnimationTarget,
  haveMatchingAnimationsChanged,
  haveTrackedElementsChanged,
  selectAnimationContributionSnapshot,
  matchesDefsChildTarget,
  matchesDefElementTarget,
  type AnimationContributionSnapshot,
} from './animationStructureUtils';
export { AdvancedAnimationStructureBadges } from './AnimationStructureBadges';

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
  const { elements, animations } = useFrozenCanvasStoreValueDuringDrag(
    useCallback(selectAnimationContributionSnapshot, []),
    shallow,
    useCallback(
      ({ previousValue, nextValue }: {
        previousValue: AnimationContributionSnapshot;
        nextValue: AnimationContributionSnapshot;
      }) => (
        haveTrackedElementsChanged(node, previousValue.elements, nextValue.elements) ||
        haveMatchingAnimationsChanged(node, previousValue, nextValue)
      ),
      [node]
    )
  );

  const {
    addElement,
    updateElement,
    addAnimation,
    updateAnimation,
    removeAnimation,
    createFadeAnimation,
    createMoveAnimation,
    createPathDrawAnimation,
  } = useCanvasStore(
    useShallow((state) => {
      const slice = state as CanvasStore & AnimationPluginSlice;
      return {
        addElement: state.addElement,
        updateElement: state.updateElement,
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
      <Text fontSize="xs" color="text.muted" noOfLines={1}>
        {value}
      </Text>
    );
    const badge = (label: string) => (
      <Badge colorScheme="gray" fontSize="2xs" px={1} py={0.25} borderRadius="sm">
        {label}
      </Badge>
    );
    const chain = (baseId: string, baseType: string, childLabel?: string, childType?: string) => (
      <HStack spacing={1} align="center" flexWrap="wrap">
        {text(baseId)}
        {badge(baseType)}
        {childLabel && (
          <>
            <Text fontSize="xs" color="text.muted">→</Text>
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
  const { childIndex, defsOwnerId, idAttribute, isDefs, tagName } = node;

  const matchingAnimations = useMemo(() => {
    if (!targetId) return [] as SVGAnimation[];

    // For defs children (elements inside a def, with a child index), match by owner ID + child index
    if (isDefsChild && defsOwnerId && childIndex !== undefined) {
      return animations.filter((anim) =>
        matchesDefsChildTarget(anim, defsOwnerId, childIndex, tagName)
      );
    }

    // For def elements themselves (gradient, pattern, etc.), match animations on the def itself
    // These are identified by isDefs=true, having idAttribute, but no childIndex
    const isDefElement = isDefs && idAttribute && isDefContainerTag;
    if (isDefElement) {
      return animations.filter((anim) =>
        matchesDefElementTarget(anim, idAttribute, tagName)
      );
    }

    // For regular elements, match by element ID
    const idList = Array.from(targetIds);
    return animations.filter((anim) => idList.some((id) => matchesAnimationTarget(anim, id)));
  }, [animations, childIndex, defsOwnerId, idAttribute, isDefContainerTag, isDefs, isDefsChild, tagName, targetId, targetIds]);

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
        const viewport = canvasStoreApi.getState().viewport;

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
        const viewport = canvasStoreApi.getState().viewport;

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
        const viewport = canvasStoreApi.getState().viewport;

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
    [addAnimation, calculateBoundsFromElements, createFadeAnimation, createMoveAnimation, createPathDrawAnimation, elementMap, getDescendantElements, getElementPaths, targetId, wrapElementInGroup]
  );

  const handleConfirmPreset = useCallback(() => {
    applyPreset(selectedPreset);
  }, [applyPreset, selectedPreset]);

  const motionPathOptions = useMemo(
    () => [
      { value: '', label: 'Inline path' },
      ...elements
        .filter((el) => el.type === 'path' || el.type === 'nativeShape')
        .map((el) => ({ value: el.id, label: ((el.data as { name?: string } | undefined)?.name) || el.id })),
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
              {animationCount} ANIM{animationCount === 1 ? '' : 'S'}
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

