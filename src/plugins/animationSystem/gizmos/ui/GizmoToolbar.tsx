/**
 * Gizmo Toolbar Component
 * 
 * UI component for activating/deactivating animation gizmos.
 * Displays available gizmos for the selected element's animations.
 */

import { useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  Badge,
} from '@chakra-ui/react';
import {
  LogIn,
  LogOut,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../../../store/canvasStore';
import { useGizmoContextOptional } from '../GizmoContext';
import { animationGizmoRegistry } from '../registry/GizmoRegistry';
import type { SVGAnimation, AnimationPluginSlice } from '../../types';
import type { CanvasElement } from '../../../../types';
import { GizmoKeyframeTrack } from './GizmoKeyframeTrack';
import ConditionalTooltip from '../../../../ui/ConditionalTooltip';

// =============================================================================
// Compact Version
// =============================================================================

interface AnimationGizmoRowProps {
  animation: SVGAnimation;
  isActive: boolean;
  onToggle: (animationId: string) => void;
}

/**
 * Single row for an animation with Enter/Exit control
 */
function AnimationGizmoRow({
  animation,
  isActive,
  onToggle,
}: AnimationGizmoRowProps) {
  // Try to find the gizmo definition to get the proper name
  const gizmo = animationGizmoRegistry.getAll().find((g) => 
    g.canHandle?.(animation) || g.appliesTo?.(animation, {} as CanvasElement)
  );
  
  // Use gizmo name if available, otherwise fallback to animation type
  const label = gizmo?.metadata?.name 
    ?? (animation.type === 'animateTransform' 
      ? `${animation.transformType ?? 'transform'}` 
      : animation.attributeName === 'd'
        ? 'morphing'
        : animation.type.replace('animate', ''));
  
  return (
    <HStack spacing={1} justify="space-between" w="100%">
      <Text fontSize="xs" noOfLines={1} flex={1} minW={0}>
        {label}
      </Text>
      
      {/* Enter/Exit button - activates gizmo and edit mode */}
      <ConditionalTooltip label={isActive ? 'Exit gizmo mode' : 'Enter gizmo mode'}>
        <Button
          size="xs"
          leftIcon={isActive ? <LogOut size={12} /> : <LogIn size={12} />}
          colorScheme={isActive ? 'blue' : 'gray'}
          variant={isActive ? 'solid' : 'outline'}
          onClick={() => onToggle(animation.id)}
        >
          {isActive ? 'Exit' : 'Enter'}
        </Button>
      </ConditionalTooltip>
    </HStack>
  );
}

export function GizmoToolbarCompact(): React.ReactElement | null {
  // Get selected element, its ancestors, and animations
  const { selectedElementId, animations, elements } = useCanvasStore(
    useShallow((state) => {
      const animSlice = state as CanvasStore & AnimationPluginSlice;
      return {
        selectedElementId: (state.selectedIds ?? [])[0] ?? null,
        animations: animSlice.animations ?? [],
        elements: state.elements,
      };
    })
  );

  // Get the selected element and its ancestor chain (for group support)
  const ancestorIds = useMemo(() => {
    if (!selectedElementId) return [] as string[];
    
    const element = elements.find(el => el.id === selectedElementId);
    if (!element) return [] as string[];
    
    // Build ancestor chain
    const ancestors: string[] = [];
    let currentId = element.parentId;
    while (currentId) {
      ancestors.push(currentId);
      const parent = elements.find(el => el.id === currentId);
      currentId = parent?.parentId ?? null;
    }
    
    return ancestors;
  }, [selectedElementId, elements]);

  // Filter animations for selected element AND its ancestors (for groups)
  // AND that have a gizmo definition available
  const elementAnimations = useMemo(() => {
    if (!selectedElementId) return [];
    const relevantIds = new Set([selectedElementId, ...ancestorIds]);
    
    return animations.filter((a) => {
      // Must be for a relevant element
      if (!relevantIds.has(a.targetElementId)) return false;
      
      // Must have a gizmo that can handle it
      const element = elements.find(el => el.id === a.targetElementId);
      if (!element) return false;
      
      // Check if any registered gizmo can handle this animation
      const allGizmos = animationGizmoRegistry.getAll();
      return allGizmos.some(gizmo => {
        try {
          return gizmo.canHandle?.(a) || gizmo.appliesTo?.(a, element);
        } catch {
          return false;
        }
      });
    });
  }, [selectedElementId, ancestorIds, animations, elements]);

  // Get the gizmo context if available
  const gizmoContext = useGizmoContextOptional();
  
  // Track which gizmo is currently active (visible + in edit mode)
  const activeAnimationId = useMemo(() => {
    if (!gizmoContext || !gizmoContext.gizmoEditMode || gizmoContext.activeGizmos.size === 0) return null;
    // Return the first (and should be only) active gizmo's animation ID
    return Array.from(gizmoContext.activeGizmos.keys())[0] ?? null;
  }, [gizmoContext]);

  // Toggle a gizmo - activates/deactivates both visibility and edit mode together
  const handleToggle = useCallback((animationId: string) => {
    if (!gizmoContext) return;
    
    const isCurrentlyActive = gizmoContext.gizmoEditMode && gizmoContext.activeGizmos.has(animationId);
    
    if (isCurrentlyActive) {
      // Exit: hide gizmo and disable edit mode
      gizmoContext.deactivateGizmo(animationId);
      gizmoContext.setGizmoEditMode(false);
    } else {
      // Enter: deactivate any other gizmo, activate this one, enable edit mode
      gizmoContext.deactivateAllGizmos();
      gizmoContext.activateGizmo(animationId);
      gizmoContext.setGizmoEditMode(true);
    }
  }, [gizmoContext]);

  const activeKeyframeSelector = useMemo(() => {
    if (!gizmoContext || !activeAnimationId) return null;

    const gizmoState = gizmoContext.activeGizmos.get(activeAnimationId);
    const animation = animations.find((a) => a.id === activeAnimationId);

    const keyframes = gizmoState?.props.keyframes as unknown;
    const keyframeCount = Array.isArray(keyframes)
      ? keyframes.length
      : animation?.values
        ? animation.values
            .split(';')
            .map((v) => v.trim())
            .filter(Boolean).length
        : 0;

    if (keyframeCount <= 2) return null;

    const parsedKeyTimes =
      animation?.keyTimes
        ? animation.keyTimes
            .split(';')
            .map((v) => parseFloat(v.trim()))
            .filter((n) => Number.isFinite(n))
        : [];

    const keyTimes =
      parsedKeyTimes.length === keyframeCount
        ? parsedKeyTimes
        : Array.from({ length: keyframeCount }, (_, i) =>
            keyframeCount > 1 ? i / (keyframeCount - 1) : 0
          );

    const rawSelectedIndex = gizmoState?.props.activeKeyframeIndex as unknown;
    const selectedIndex =
      typeof rawSelectedIndex === 'number' && Number.isFinite(rawSelectedIndex)
        ? Math.max(0, Math.min(keyframeCount - 1, Math.round(rawSelectedIndex)))
        : keyframeCount - 1;

    return {
      keyframeCount,
      keyTimes,
      selectedIndex,
    };
  }, [gizmoContext, activeAnimationId, animations]);

  if (!selectedElementId || elementAnimations.length === 0) {
    return null;
  }

  return (
    <VStack spacing={1} p={2} bg="blackAlpha.50" borderRadius="md" align="stretch">
      <HStack justify="space-between">
        <Text fontSize="xs" fontWeight="medium" opacity={0.7}>
          Gizmos
        </Text>
        <Badge size="sm" colorScheme="purple">
          {elementAnimations.length}
        </Badge>
      </HStack>
      
      {gizmoContext ? (
        <VStack spacing={1} align="stretch">
          {elementAnimations.map((animation) => (
            <AnimationGizmoRow
              key={animation.id}
              animation={animation}
              isActive={activeAnimationId === animation.id}
              onToggle={handleToggle}
            />
          ))}

          {activeAnimationId && activeKeyframeSelector && (
            <Box pt={1}>
              <HStack justify="space-between" align="center">
                <Text fontSize="xs" opacity={0.7}>
                  Keyframes
                </Text>
                <Badge size="sm" colorScheme="blue">
                  {activeKeyframeSelector.selectedIndex + 1}/{activeKeyframeSelector.keyframeCount}
                </Badge>
              </HStack>
              <GizmoKeyframeTrack
                keyTimes={activeKeyframeSelector.keyTimes}
                selectedIndex={activeKeyframeSelector.selectedIndex}
                onSelect={(index) => {
                  gizmoContext.updateGizmoProps(activeAnimationId, { activeKeyframeIndex: index });
                }}
              />
            </Box>
          )}
        </VStack>
      ) : (
        <Text fontSize="xs" opacity={0.5}>
          Gizmo system not available
        </Text>
      )}
    </VStack>
  );
}
