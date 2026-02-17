import React from 'react';
import { Flex, Text, useColorModeValue } from '@chakra-ui/react';

interface LibrarySectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional right-side action element */
  action?: React.ReactNode;
  /** Reduce vertical padding for compact layouts */
  compact?: boolean;
}

/**
 * Compact section header for library panels.
 * Designed for 233px max-width panels with consistent styling.
 * 
 * Usage:
 * <LibrarySectionHeader title="Details" />
 * <LibrarySectionHeader title="Presets" action={<PanelStyledButton>Add All</PanelStyledButton>} />
 */
export const LibrarySectionHeader: React.FC<LibrarySectionHeaderProps> = ({
  title,
  action,
  compact = false,
}) => {
  const textColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Flex
      align="center"
      justify="space-between"
      py={compact ? 0 : 0.5}
      minH="20px"
    >
      <Text
        fontSize="11px"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="0.5px"
        color={textColor}
      >
        {title}
      </Text>
      {action}
    </Flex>
  );
};
