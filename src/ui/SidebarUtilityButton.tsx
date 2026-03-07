import React from 'react';
import { Button } from '@chakra-ui/react';
import { useThemeColors } from '../hooks/useThemeColors';
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
  inactiveBg?: string;
  visualStyle?: 'default' | 'tab';
  minWidth?: string | number;
  tabShape?: 'full' | 'left' | 'right' | 'none';
  tabPaddingX?: string | number;
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
  inactiveBg,
  visualStyle = 'default',
  minWidth,
  tabShape = 'full',
  tabPaddingX,
}) => {
  const {
    toggle: {
      inactive: { color: inactiveColor, border: inactiveBorder, hoverBg: inactiveHoverBg },
      active: { bg: activeBg, color: activeColor, hoverBg: activeHoverBg },
    },
  } = useThemeColors();

  const isTab = visualStyle === 'tab';
  const showBorder = !borderless;
  const dimension = iconOnly ? '26px' : undefined;
  const controlHeight = isTab ? '26px' : (dimension ?? 'auto');
  const tabRadius = {
    topLeft: tabShape === 'full' || tabShape === 'left' ? '9px' : '0',
    bottomLeft: tabShape === 'full' || tabShape === 'left' ? '9px' : '0',
    topRight: tabShape === 'full' || tabShape === 'right' ? '9px' : '0',
    bottomRight: tabShape === 'full' || tabShape === 'right' ? '9px' : '0',
  };

  return (
    <Button
      aria-label={label}
      onClick={onClick}
      variant="unstyled"
      size="xs"
      fontSize={fontSize}
      data-active={isActive}
      bg={isActive ? activeBg : (inactiveBg ?? 'transparent')}
      isDisabled={isDisabled}
      color={isActive ? activeColor : inactiveColor}
      border={showBorder ? `${borderWidth} solid` : 'none'}
      borderColor={
        showBorder
          ? (isActive ? (activeBorderColor ?? activeBg) : (inactiveBorderColor ?? inactiveBorder))
          : 'transparent'
      }
      borderRadius={isTab ? undefined : 'full'}
      borderTopLeftRadius={isTab ? tabRadius.topLeft : undefined}
      borderBottomLeftRadius={isTab ? tabRadius.bottomLeft : undefined}
      borderTopRightRadius={isTab ? tabRadius.topRight : undefined}
      borderBottomRightRadius={isTab ? tabRadius.bottomRight : undefined}
      fontWeight={isTab ? (isActive ? 'semibold' : 'medium') : 'bold'}
      transition="all 0.2s"
      width={iconOnly ? dimension : (fullWidth ? 'full' : 'auto')}
      flex={fullWidth ? '1 1 0' : flex}
      alignSelf={fullWidth ? 'stretch' : undefined}
      minW={minWidth ?? dimension}
      minH={controlHeight}
      h={controlHeight}
      _hover={{
        bg: isActive ? activeHoverBg : inactiveHoverBg,
      }}
      _focus={{ outline: 'none', boxShadow: 'none' }}
      sx={{
        px: iconOnly ? 0 : (isTab ? (tabPaddingX ?? 1) : 2),
        py: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        WebkitAppearance: 'none',
        appearance: 'none',
        ...NO_TAP_HIGHLIGHT,
      }}
    >
      {Icon ? <Icon size={iconSize} /> : label}
    </Button>
  );
};
