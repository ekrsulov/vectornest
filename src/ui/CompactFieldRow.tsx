import React from 'react';
import { Flex, Text, Box, useColorModeValue } from '@chakra-ui/react';

interface CompactFieldRowProps {
  /** Field label */
  label: string;
  /** Label width - default optimized for narrow panels */
  labelWidth?: string;
  /** Field input/content */
  children: React.ReactNode;
  /** Reduce vertical spacing */
  compact?: boolean;
  /** Align items */
  align?: 'center' | 'flex-start' | 'flex-end';
}

/**
 * Compact field row for narrow library panels (233px max).
 * Provides consistent label-input layout with minimal spacing.
 * 
 * Usage:
 * <CompactFieldRow label="Name">
 *   <PanelTextInput value={name} onChange={setName} width="full" />
 * </CompactFieldRow>
 * 
 * <CompactFieldRow label="Size" labelWidth="40px">
 *   <NumberInput value={size} onChange={setSize} />
 * </CompactFieldRow>
 */
export const CompactFieldRow: React.FC<CompactFieldRowProps> = ({
  label,
  labelWidth = '50px',
  children,
  compact = false,
  align = 'center',
}) => {
  const labelColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Flex
      align={align}
      gap={1.5}
      py={compact ? 0 : 0.5}
      minH="24px"
    >
      <Text
        fontSize="xs"
        color={labelColor}
        w={labelWidth}
        flexShrink={0}
        whiteSpace="nowrap"
      >
        {label}
      </Text>
      <Box flex={1} minW={0}>
        {children}
      </Box>
    </Flex>
  );
};

interface CompactFieldGroupProps {
  /** Multiple NumberInputs or similar inline controls */
  children: React.ReactNode;
}

/**
 * Horizontal group for multiple compact inputs (e.g., W/H, X/Y pairs).
 * Children are laid out inline with minimal gap.
 */
export const CompactFieldGroup: React.FC<CompactFieldGroupProps> = ({
  children,
}) => {
  return (
    <Flex align="center" gap={2} flex={1} minW={0}>
      {children}
    </Flex>
  );
};
