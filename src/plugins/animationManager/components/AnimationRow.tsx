/**
 * AnimationRow — Single animation row in the Animation Map.
 * Shows type badges and actions on the first line, with description on the second line.
 */

import React, { useCallback } from 'react';
import { Badge, Box, HStack, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { Trash2, Copy, Crosshair } from 'lucide-react';
import { PanelActionButton } from '../../../ui/PanelActionButton';
import type { SVGAnimation } from '../../animationSystem/types';
import {
  generateAnimationDescription,
  getAnimationTypeLabel,
  formatDuration,
  formatRepeatCount,
} from '../utils/descriptionGenerator';
import { getAnimationTypeTone } from '../utils/animationTypeColors';

interface AnimationRowProps {
  animation: SVGAnimation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onActivateGizmo?: (id: string) => void;
  isGizmoActive?: boolean;
}

export const AnimationRow: React.FC<AnimationRowProps> = ({
  animation,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onActivateGizmo,
  isGizmoActive = false,
}) => {
  const description = generateAnimationDescription(animation);
  const typeLabel = getAnimationTypeLabel(animation);
  const duration = formatDuration(animation.dur);
  const repeat = formatRepeatCount(animation.repeatCount);
  const typeTone = getAnimationTypeTone(animation.type);
  const timingLabel = repeat !== '1' ? `${duration} ×${repeat}` : duration;
  const timingBadgeBg = useColorModeValue('gray.100', 'whiteAlpha.200');
  const timingBadgeColor = useColorModeValue('gray.800', 'gray.100');
  const selectedBg = useColorModeValue('gray.200', 'whiteAlpha.200');
  const hoverBg = useColorModeValue('gray.100', 'whiteAlpha.100');

  const handleClick = useCallback(() => {
    onSelect(animation.id);
  }, [animation.id, onSelect]);

  const handleDelete = useCallback(
    (e?: React.MouseEvent | React.PointerEvent) => {
      e?.stopPropagation();
      onDelete(animation.id);
    },
    [animation.id, onDelete],
  );

  const handleDuplicate = useCallback(
    (e?: React.MouseEvent | React.PointerEvent) => {
      e?.stopPropagation();
      onDuplicate(animation.id);
    },
    [animation.id, onDuplicate],
  );

  const handleGizmo = useCallback(
    (e?: React.MouseEvent | React.PointerEvent) => {
      e?.stopPropagation();
      onActivateGizmo?.(animation.id);
    },
    [animation.id, onActivateGizmo],
  );

  return (
    <Box
      px={2}
      py={1.5}
      borderRadius="md"
      cursor="pointer"
      bg={isSelected ? selectedBg : 'transparent'}
      _hover={{ bg: isSelected ? selectedBg : hoverBg }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Animation: ${description}`}
      minW={0}
    >
      <VStack align="stretch" spacing={0.5} minW={0}>
        <HStack justify="space-between" align="center" spacing={2} minW={0}>
          <HStack spacing={1} minW={0} flex={1} flexWrap="wrap">
            <Badge
              px={1.5}
              py={0.5}
              borderRadius="sm"
              fontSize="9px"
              fontWeight="bold"
              letterSpacing="0.5px"
              textTransform="uppercase"
              bg={typeTone.bg}
              color={typeTone.color}
            >
              {typeLabel}
            </Badge>
            <Badge
              px={1.5}
              py={0.5}
              borderRadius="sm"
              fontSize="9px"
              fontWeight="semibold"
              bg={timingBadgeBg}
              color={timingBadgeColor}
            >
              {timingLabel}
            </Badge>
          </HStack>

          <HStack spacing={0} flexShrink={0}>
            {onActivateGizmo && (
              <PanelActionButton
                icon={Crosshair}
                iconSize={10}
                label={isGizmoActive ? 'Exit Gizmo' : 'Edit with Gizmo'}
                onClick={handleGizmo}
                height="18px"
                variant={isGizmoActive ? 'solid' : 'ghost'}
              />
            )}
            <PanelActionButton
              icon={Copy}
              iconSize={10}
              label="Duplicate"
              onClick={handleDuplicate}
              height="18px"
            />
            <PanelActionButton
              icon={Trash2}
              iconSize={10}
              label="Delete"
              onClick={handleDelete}
              height="18px"
              variant="ghost"
            />
          </HStack>
        </HStack>

        <Text
          fontSize="11px"
          color="text.primary"
          title={description}
          minW={0}
          whiteSpace="normal"
          wordBreak="break-word"
        >
          {description}
        </Text>
      </VStack>
    </Box>
  );
};
