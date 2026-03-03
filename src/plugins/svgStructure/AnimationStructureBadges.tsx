import React, { useMemo } from 'react';
import { Badge } from '@chakra-ui/react';
import { useShallow } from 'zustand/react/shallow';
import type { SvgStructureContributionProps } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { AnimationPluginSlice } from '../animationSystem/types';
import { useCanvasStore } from '../../store/canvasStore';
import { getReferencedIds } from '../../utils/referenceUtils';
import {
  DEF_CONTAINER_TAGS,
  matchesDefsChildTarget,
  matchesDefElementTarget,
} from './animationStructureUtils';

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
    <Badge colorScheme="blue" fontSize="2xs" px={1} py={0.5} borderRadius="sm">
      {!node.isDefs && indirectCount > 0
        ? directCount > 0
          ? `${directCount} → ${indirectCount}`
          : `→${indirectCount}`
        : directCount}
    </Badge>
  );
};
