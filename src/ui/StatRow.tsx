/**
 * StatRow — reusable label + value row for audit/statistics panels.
 *
 * Consolidates the duplicated pattern found in PathStatistics, SelectionStatistics,
 * AnchorPointAnalyzer, WhiteSpaceAnalyzer, DistanceMatrix, GradientMapper, etc.
 */

import React from 'react';
import { HStack, Text } from '@chakra-ui/react';

export interface StatRowProps {
  /** Left-side label text */
  label: string;
  /** Right-side value text */
  value: string | number;
  /** Optional colour override for the value text (light mode) */
  color?: string;
  /** Optional colour override for the value text in dark mode (defaults to color) */
  darkColor?: string;
}

const StatRowComponent: React.FC<StatRowProps> = ({ label, value, color, darkColor }) => (
  <HStack justify="space-between" px={2} py={0.5}>
    <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>{label}</Text>
    <Text fontSize="xs" color={color || 'gray.700'} _dark={{ color: darkColor || color || 'gray.300' }} fontFamily="mono">{value}</Text>
  </HStack>
);

export const StatRow = React.memo(StatRowComponent);
StatRow.displayName = 'StatRow';
