/**
 * AnimationRow — Single animation row in the Animation Map.
 * Shows type icon, description, duration, repeat count, and hover actions.
 */

import React, { useCallback } from 'react';
import { Box, HStack, Text, Flex } from '@chakra-ui/react';
import { Trash2, Copy, Crosshair } from 'lucide-react';
import { PanelActionButton } from '../../../ui/PanelActionButton';
import type { SVGAnimation } from '../../animationSystem/types';
import {
  generateAnimationDescription,
  getAnimationTypeLabel,
  formatDuration,
  formatRepeatCount,
} from '../utils/descriptionGenerator';

interface AnimationRowProps {
  animation: SVGAnimation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onActivateGizmo?: (id: string) => void;
}

export const AnimationRow: React.FC<AnimationRowProps> = ({
  animation,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onActivateGizmo,
}) => {
  const description = generateAnimationDescription(animation);
  const typeLabel = getAnimationTypeLabel(animation);
  const duration = formatDuration(animation.dur);
  const repeat = formatRepeatCount(animation.repeatCount);

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
    <Flex
      align="center"
      px={2}
      py={1}
      borderRadius="md"
      cursor="pointer"
      bg={isSelected ? 'whiteAlpha.200' : 'transparent'}
      _hover={{ bg: isSelected ? 'whiteAlpha.200' : 'whiteAlpha.100' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Animation: ${description}`}
      gap={1}
    >
      {/* Type badge */}
      <Box
        fontSize="9px"
        fontWeight="bold"
        textTransform="uppercase"
        bg="whiteAlpha.200"
        px={1}
        py={0.5}
        borderRadius="sm"
        flexShrink={0}
        lineHeight="1.2"
        letterSpacing="0.5px"
      >
        {typeLabel}
      </Box>

      {/* Description */}
      <Text
        fontSize="11px"
        flex={1}
        isTruncated
        title={description}
      >
        {description}
      </Text>

      {/* Duration */}
      <Text
        fontSize="10px"
        color="gray.500"
        flexShrink={0}
      >
        {duration}
      </Text>

      {/* Repeat */}
      {repeat !== '1' && (
        <Text
          fontSize="10px"
          color="purple.400"
          flexShrink={0}
          fontWeight="medium"
        >
          {repeat}
        </Text>
      )}

      {/* Hover actions */}
      <HStack
        spacing={0}
        opacity={0}
        _groupHover={{ opacity: 1 }}
        sx={{
          '[role=button]:hover &, [role=button]:focus-within &': {
            opacity: 1,
          },
        }}
        flexShrink={0}
      >
        {onActivateGizmo && (
          <PanelActionButton
            icon={Crosshair}
            iconSize={10}
            label="Gizmo"
            onClick={handleGizmo}
            height="16px"
          />
        )}
        <PanelActionButton
          icon={Copy}
          iconSize={10}
          label="Duplicate"
          onClick={handleDuplicate}
          height="16px"
        />
        <PanelActionButton
          icon={Trash2}
          iconSize={10}
          label="Delete"
          onClick={handleDelete}
          height="16px"
          variant="ghost"
        />
      </HStack>
    </Flex>
  );
};
