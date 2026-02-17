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
  ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Text,
  Tooltip,
  VStack,
  Divider,
  Badge,
  Switch,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  Move,
  RotateCw,
  Maximize2,
  ArrowRightLeft,
  Play,
  Pause,
  Square,
  Settings2,
  Layers,
  LogIn,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore, type CanvasStore } from '../../../../store/canvasStore';
import { useGizmoContextOptional } from '../GizmoContext';
import { animationGizmoRegistry } from '../registry/GizmoRegistry';
import type { AnimationGizmoDefinition, AnimationCategory } from '../types';
import type { SVGAnimation, AnimationPluginSlice } from '../../types';
import type { CanvasElement } from '../../../../types';
import { GizmoKeyframeTrack } from './GizmoKeyframeTrack';

// =============================================================================
// Icons by Gizmo Type
// =============================================================================

const GIZMO_ICONS: Record<string, LucideIcon> = {
  translate: Move,
  rotate: RotateCw,
  scale: Maximize2,
  skew: ArrowRightLeft,
  // More icons can be added as gizmos are implemented
};

const CATEGORY_ICONS: Partial<Record<AnimationCategory, LucideIcon>> = {
  transform: Move,
  vector: Layers,
  style: Settings2,
  'clip-mask': Layers,
  'gradient-pattern': Layers,
  filter: Settings2,
  hierarchy: Layers,
  interactive: Play,
  typography: Settings2,
  fx: Settings2,
  scene: Layers,
  gradient: Layers,
};

// =============================================================================
// Types
// =============================================================================

interface GizmoButtonProps {
  gizmo: AnimationGizmoDefinition;
  animation: SVGAnimation;
  isActive: boolean;
  onToggle: () => void;
}

interface GizmoToolbarProps {
  /** Whether toolbar is in compact mode */
  compact?: boolean;
  /** Orientation of the toolbar */
  orientation?: 'horizontal' | 'vertical';
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Single gizmo activation button
 */
function GizmoButton({ gizmo, animation: _animation, isActive, onToggle }: GizmoButtonProps) {
  const Icon = GIZMO_ICONS[gizmo.id] || Settings2;

  return (
    <Tooltip
      label={
        <VStack align="start" spacing={0}>
          <Text fontWeight="bold">{gizmo.metadata?.name ?? gizmo.label ?? gizmo.id}</Text>
          <Text fontSize="xs" opacity={0.8}>
            {gizmo.metadata?.description ?? gizmo.description ?? ''}
          </Text>
          {gizmo.metadata?.keyboardShortcut && (
            <Text fontSize="xs" opacity={0.6}>
              Shortcut: {gizmo.metadata?.keyboardShortcut}
            </Text>
          )}
        </VStack>
      }
      placement="top"
      hasArrow
    >
      <IconButton
        aria-label={gizmo.metadata?.name ?? gizmo.label ?? gizmo.id}
        icon={<Icon size={16} />}
        size="sm"
        variant={isActive ? 'solid' : 'ghost'}
        colorScheme={isActive ? 'blue' : 'gray'}
        onClick={onToggle}
      />
    </Tooltip>
  );
}

/**
 * Playback controls for animation preview
 */
function PlaybackControls() {
  const { isPlaying, currentTime } = useCanvasStore(
    useShallow((state) => {
      const animSlice = state as CanvasStore & AnimationPluginSlice;
      return {
        isPlaying: animSlice.animationState?.isPlaying ?? false,
        currentTime: animSlice.animationState?.currentTime ?? 0,
      };
    })
  );
  const duration = 1; // Default duration

  const handlePlay = useCallback(() => {
    // Would connect to animationEngine.play()
    console.log('[GizmoToolbar] Play');
  }, []);

  const handlePause = useCallback(() => {
    // Would connect to animationEngine.pause()
    console.log('[GizmoToolbar] Pause');
  }, []);

  const handleStop = useCallback(() => {
    // Would connect to animationEngine.stop()
    console.log('[GizmoToolbar] Stop');
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <HStack spacing={1}>
      <ButtonGroup size="sm" isAttached variant="ghost">
        <IconButton
          aria-label={isPlaying ? 'Pause' : 'Play'}
          icon={isPlaying ? <Pause size={14} /> : <Play size={14} />}
          onClick={isPlaying ? handlePause : handlePlay}
        />
        <IconButton
          aria-label="Stop"
          icon={<Square size={14} />}
          onClick={handleStop}
        />
      </ButtonGroup>
      <Box w="60px" h="4px" bg="gray.200" borderRadius="full" overflow="hidden">
        <Box w={`${progress}%`} h="full" bg="blue.500" transition="width 0.1s" />
      </Box>
      <Text fontSize="xs" fontFamily="mono" minW="40px">
        {currentTime.toFixed(1)}s
      </Text>
    </HStack>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function GizmoToolbar({
  compact: _compact = false,
  orientation = 'horizontal',
}: GizmoToolbarProps): React.ReactElement | null {
  const gizmoContext = useGizmoContextOptional();

  // Get selected element and its animations
  const { selectedElementId, animations } = useCanvasStore(
    useShallow((state) => {
      const animSlice = state as CanvasStore & AnimationPluginSlice;
      return {
        selectedElementId: (state.selectedIds ?? [])[0] ?? null,
        animations: animSlice.animations ?? [],
      };
    })
  );

  // Filter animations for selected element
  const elementAnimations = useMemo(() => {
    if (!selectedElementId) return [];
    return animations.filter((a) => a.targetElementId === selectedElementId);
  }, [selectedElementId, animations]);

  // Get available gizmos for these animations
  const availableGizmos = useMemo(() => {
    const gizmos: Array<{
      definition: AnimationGizmoDefinition;
      animation: SVGAnimation;
    }> = [];

    for (const animation of elementAnimations) {
      const allGizmos = animationGizmoRegistry.getAll();
      for (const gizmo of allGizmos) {
        if (gizmo.canHandle?.(animation) || gizmo.appliesTo?.(animation, {} as CanvasElement)) {
          gizmos.push({ definition: gizmo, animation });
        }
      }
    }

    return gizmos;
  }, [elementAnimations]);

  // Group by category
  const gizmosByCategory = useMemo(() => {
    const groups = new Map<AnimationCategory, typeof availableGizmos>();

    for (const item of availableGizmos) {
      const category = item.definition.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    }

    return groups;
  }, [availableGizmos]);

  // Toggle gizmo activation
  const handleToggleGizmo = useCallback(
    (animationId: string) => {
      if (!gizmoContext) return;

      if (gizmoContext.activeGizmos.has(animationId)) {
        gizmoContext.deactivateGizmo(animationId);
      } else {
        gizmoContext.activateGizmo(animationId);
      }
    },
    [gizmoContext]
  );

  // Toggle gizmo edit mode
  const handleToggleEditMode = useCallback(() => {
    if (!gizmoContext) return;
    gizmoContext.setGizmoEditMode(!gizmoContext.gizmoEditMode);
  }, [gizmoContext]);

  // Don't render if no context or no animations
  if (!gizmoContext) {
    return (
      <Box p={2} opacity={0.5}>
        <Text fontSize="sm">Gizmo system not initialized</Text>
      </Box>
    );
  }

  if (!selectedElementId) {
    return (
      <Box p={2} opacity={0.5}>
        <Text fontSize="sm">Select an element to edit animations</Text>
      </Box>
    );
  }

  if (elementAnimations.length === 0) {
    return (
      <Box p={2} opacity={0.5}>
        <Text fontSize="sm">No animations on selected element</Text>
      </Box>
    );
  }

  if (availableGizmos.length === 0) {
    return (
      <Box p={2} opacity={0.5}>
        <Text fontSize="sm">No gizmos available for current animations</Text>
      </Box>
    );
  }

  const Container = orientation === 'horizontal' ? HStack : VStack;

  return (
    <Box
      p={2}
      bg="whiteAlpha.900"
      borderRadius="md"
      boxShadow="sm"
      _dark={{ bg: 'gray.800' }}
    >
      <VStack align="stretch" spacing={2}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            <Settings2 size={16} />
            <Text fontSize="sm" fontWeight="medium">
              Animation Gizmos
            </Text>
            <Badge colorScheme="blue" size="sm">
              {availableGizmos.length}
            </Badge>
          </HStack>

          <FormControl display="flex" alignItems="center" w="auto">
            <FormLabel htmlFor="gizmo-edit-mode" mb="0" fontSize="xs">
              Edit Mode
            </FormLabel>
            <Switch
              id="gizmo-edit-mode"
              size="sm"
              isChecked={gizmoContext.gizmoEditMode}
              onChange={handleToggleEditMode}
            />
          </FormControl>
        </Flex>

        <Divider />

        {/* Gizmos by Category */}
        {Array.from(gizmosByCategory.entries()).map(([category, items]) => {
          const CategoryIcon = CATEGORY_ICONS[category];

          return (
            <Box key={category}>
              <HStack spacing={1} mb={1}>
                {CategoryIcon && <CategoryIcon size={12} />}
                <Text fontSize="xs" textTransform="capitalize" opacity={0.7}>
                  {category}
                </Text>
              </HStack>

              <Container spacing={1}>
                {items.map(({ definition, animation }) => {
                  const isActive = gizmoContext.activeGizmos.has(animation.id);

                  return (
                    <GizmoButton
                      key={`${definition.id}-${animation.id}`}
                      gizmo={definition}
                      animation={animation}
                      isActive={isActive}
                      onToggle={() => handleToggleGizmo(animation.id)}
                    />
                  );
                })}
              </Container>
            </Box>
          );
        })}

        <Divider />

        {/* Playback Controls */}
        <PlaybackControls />

        {/* Active Gizmos Info */}
        {gizmoContext.activeGizmos.size > 0 && (
          <>
            <Divider />
            <HStack justify="space-between">
              <Text fontSize="xs" opacity={0.7}>
                Active: {gizmoContext.activeGizmos.size} gizmo(s)
              </Text>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => gizmoContext.deactivateAllGizmos()}
              >
                Deactivate All
              </Button>
            </HStack>
          </>
        )}
      </VStack>
    </Box>
  );
}

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
      <Tooltip label={isActive ? 'Exit gizmo mode' : 'Enter gizmo mode'}>
        <Button
          size="xs"
          leftIcon={isActive ? <LogOut size={12} /> : <LogIn size={12} />}
          colorScheme={isActive ? 'blue' : 'gray'}
          variant={isActive ? 'solid' : 'outline'}
          onClick={() => onToggle(animation.id)}
        >
          {isActive ? 'Exit' : 'Enter'}
        </Button>
      </Tooltip>
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

// =============================================================================
// Export
// =============================================================================

export default GizmoToolbar;
