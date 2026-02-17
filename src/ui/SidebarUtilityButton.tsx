import React from 'react';
import { Button } from '@chakra-ui/react';
import { useThemeColors } from '../hooks';
import { NO_TAP_HIGHLIGHT } from '../constants';

interface SidebarUtilityButtonProps {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  fullWidth?: boolean;
  /** Flex grow value for distributing space (e.g., 1 for equal, 2 for double) */
  flex?: number;
  icon?: React.ComponentType<{ size?: number }>;
  iconSize?: number;
  iconOnly?: boolean;
  isDisabled?: boolean;
  fontSize?: string;
  borderless?: boolean;
  borderWidth?: string;
  inactiveBorderColor?: string;
  activeBorderColor?: string;
}

/**
 * Styled button component for sidebar utility actions (File, Settings, Pin)
 * Extracted from SidebarToolGrid to eliminate duplicate button styling
 */
export const SidebarUtilityButton: React.FC<SidebarUtilityButtonProps> = ({
  label,
  isActive = false,
  onClick,
  fullWidth = false,
  flex,
  icon: Icon,
  iconSize = 14,
  iconOnly = false,
  isDisabled = false,
  fontSize = 'sm',
  borderless = false,
  borderWidth = '1px',
  inactiveBorderColor,
  activeBorderColor,
}) => {
  const {
    toggle: {
      inactive: { color: inactiveColor, border: inactiveBorder, hoverBg: inactiveHoverBg },
      active: { bg: activeBg, color: activeColor, hoverBg: activeHoverBg },
    },
  } = useThemeColors();

  const showBorder = !borderless;
  const dimension = iconOnly ? '26px' : undefined;

  return (
    <Button
      aria-label={label}
      onClick={onClick}
      variant="unstyled"
      size="xs"
      fontSize={fontSize}
      data-active={isActive}
      bg={isActive ? activeBg : 'transparent'}
      isDisabled={isDisabled}
      color={isActive ? activeColor : inactiveColor}
      border={showBorder ? `${borderWidth} solid` : 'none'}
      borderColor={
        showBorder
          ? (isActive ? (activeBorderColor ?? activeBg) : (inactiveBorderColor ?? inactiveBorder))
          : 'transparent'
      }
      borderRadius="full"
      fontWeight="bold"
      transition="all 0.2s"
      width={fullWidth ? 'full' : 'auto'}
      flex={fullWidth ? '1 1 0' : flex}
      alignSelf={fullWidth ? 'stretch' : undefined}
      _hover={{
        bg: isActive ? activeHoverBg : inactiveHoverBg,
      }}
      _focus={{ outline: 'none', boxShadow: 'none' }}
      sx={{
        minH: dimension ?? 'auto',
        minW: dimension,
        w: dimension,
        h: dimension ?? 'auto',
        px: iconOnly ? 0 : 2,
        py: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        WebkitAppearance: 'none',
        appearance: 'none',
        ...NO_TAP_HIGHLIGHT,
      }}
    >
      {Icon ? <Icon size={iconSize} /> : label}
    </Button>
  );
};
