import React, { memo } from 'react';
import { Box, IconButton, type IconButtonProps } from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import ConditionalTooltip from './ConditionalTooltip';
import { useThemeColors } from '../hooks';
import { NO_TAP_HIGHLIGHT } from '../constants';

interface ToolbarIconButtonProps extends Omit<IconButtonProps, 'icon' | 'aria-label'> {
  icon: LucideIcon | React.ComponentType<{ size?: number }>;
  iconSize?: number;
  label: string;
  tooltip?: string;
  counter?: number;
  counterColor?: 'gray' | 'red';
  showTooltip?: boolean;
}

/**
 * Shared toolbar icon button component used across TopActionBar and BottomActionBar
 * Provides consistent sizing, styling, tooltips, and optional counter badges
 */
const ToolbarIconButtonComponent: React.FC<ToolbarIconButtonProps> = ({
  icon: Icon,
  iconSize = 16,
  label,
  tooltip,
  counter,
  counterColor = 'gray',
  showTooltip = true,
  variant = 'ghost',
  colorScheme = 'gray',
  sx,
  ...iconButtonProps
}) => {
  const { counter: counterColors } = useThemeColors();
  const colors = counterColor === 'red' ? counterColors.danger : counterColors.neutral;
  const button = (
    <Box position="relative">
      <IconButton
        icon={<Icon size={iconSize} />}
        variant={variant}
        colorScheme={colorScheme}
        size="xs"
        sx={{
          minHeight: '32px',
          minWidth: '32px',
          borderRadius: 'full',
          WebkitAppearance: 'none',
          appearance: 'none',
          ...NO_TAP_HIGHLIGHT,
          _focus: { outline: 'none', boxShadow: 'none' },
          ...sx,
        }}
        {...iconButtonProps}
        aria-label={label}
      />
      {counter !== undefined && counter > 0 && (
        <Box
          position="absolute"
          bottom="-3px"
          left="50%"
          transform="translateX(-50%)"
          bg={colors.bg}
          color={colors.color}
          borderRadius="full"
          minW="16px"
          h="11px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="9px"
          fontWeight="bold"
          px="3px"
        >
          {counter}
        </Box>
      )}
    </Box>
  );

  if (showTooltip && (tooltip || label)) {
    return (
      <ConditionalTooltip label={tooltip ?? label} placement="top">
        {button}
      </ConditionalTooltip>
    );
  }

  return button;
};

export const ToolbarIconButton = memo(ToolbarIconButtonComponent);
