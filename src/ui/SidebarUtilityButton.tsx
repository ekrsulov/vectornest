import React from 'react';
import { Button, useColorModeValue } from '@chakra-ui/react';
import { useThemeColors } from '../hooks/useThemeColors';
import { NO_TAP_HIGHLIGHT } from '../constants';

export const SIDEBAR_UTILITY_BORDER_WIDTH = '1px';

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
  activeTopRadius?: string | number;
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
  borderWidth = SIDEBAR_UTILITY_BORDER_WIDTH,
  inactiveBorderColor,
  activeBorderColor,
  inactiveBg,
  visualStyle = 'default',
  minWidth,
  tabShape = 'full',
  tabPaddingX,
  activeTopRadius = '10px',
}) => {
  const {
    toggle: {
      inactive: { color: inactiveColor, border: inactiveBorder, hoverBg: inactiveHoverBg },
      active: { bg: activeBg, color: activeColor, hoverBg: activeHoverBg },
    },
  } = useThemeColors();

  const isTab = visualStyle === 'tab';
  const tabInactiveHoverBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.200');
  const tabActiveHoverBg = useColorModeValue('gray.900', 'gray.100');
  const tabActiveOutlineColor = useColorModeValue('blackAlpha.200', 'whiteAlpha.300');
  const showBorder = !borderless;
  const dimension = iconOnly ? '26px' : undefined;
  const controlHeight = isTab ? '26px' : (dimension ?? 'auto');
  const tabRadius = {
    topLeft: tabShape === 'full' || tabShape === 'left' ? '9px' : '0',
    bottomLeft: tabShape === 'full' || tabShape === 'left' ? '9px' : '0',
    topRight: tabShape === 'full' || tabShape === 'right' ? '9px' : '0',
    bottomRight: tabShape === 'full' || tabShape === 'right' ? '9px' : '0',
  };
  const selectedTopRadius = isTab && isActive ? activeTopRadius : undefined;
  const tabActiveInsetShadow = `inset 1px 0 0 ${tabActiveOutlineColor}, inset -1px 0 0 ${tabActiveOutlineColor}, inset 0 1px 0 ${tabActiveOutlineColor}`;

  return (
    <Button
      aria-label={label}
      onClick={onClick}
      variant="unstyled"
      size="xs"
      fontSize={fontSize}
      data-active={isActive}
      bg={isTab && isActive ? 'transparent' : (isActive ? activeBg : (inactiveBg ?? 'transparent'))}
      isDisabled={isDisabled}
      color={isActive ? activeColor : inactiveColor}
      border={showBorder ? `${borderWidth} solid` : 'none'}
      borderColor={
        showBorder
          ? (isActive ? (activeBorderColor ?? activeBg) : (inactiveBorderColor ?? inactiveBorder))
          : 'transparent'
      }
      borderRadius={isTab ? undefined : 'full'}
      borderTopLeftRadius={isTab ? (selectedTopRadius ?? tabRadius.topLeft) : undefined}
      borderBottomLeftRadius={isTab ? (isActive ? '0' : tabRadius.bottomLeft) : undefined}
      borderTopRightRadius={isTab ? (selectedTopRadius ?? tabRadius.topRight) : undefined}
      borderBottomRightRadius={isTab ? (isActive ? '0' : tabRadius.bottomRight) : undefined}
      fontWeight={isTab ? 'medium' : 'bold'}
      transition="all 0.2s"
      width={iconOnly ? dimension : (fullWidth ? 'full' : 'auto')}
      flex={fullWidth ? '1 1 0' : flex}
      alignSelf={fullWidth ? 'stretch' : undefined}
      minW={minWidth ?? dimension}
      minH={controlHeight}
      h={controlHeight}
      position="relative"
      zIndex={isTab && isActive ? 1 : undefined}
      overflow={isTab ? 'hidden' : undefined}
      boxShadow={isTab && isActive ? tabActiveInsetShadow : undefined}
      _hover={{
        bg: isTab
          ? (isActive ? 'transparent' : tabInactiveHoverBg)
          : (isActive ? activeHoverBg : inactiveHoverBg),
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
        isolation: isTab ? 'isolate' : undefined,
        '&::before': isTab
          ? {
            content: '""',
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            bg: isActive ? activeBg : 'transparent',
            borderTopLeftRadius: selectedTopRadius ?? tabRadius.topLeft,
            borderBottomLeftRadius: isActive ? '0' : tabRadius.bottomLeft,
            borderTopRightRadius: selectedTopRadius ?? tabRadius.topRight,
            borderBottomRightRadius: isActive ? '0' : tabRadius.bottomRight,
            transformOrigin: 'bottom center',
            transform: isActive ? 'translateY(0) scaleY(1)' : 'translateY(28%) scaleY(0.92)',
            opacity: isActive ? 1 : 0,
            transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease, background-color 0.28s ease',
          }
          : undefined,
        '&:hover::before': isTab && isActive ? { bg: tabActiveHoverBg } : undefined,
        '&:active::before': isTab && isActive ? { bg: tabActiveHoverBg } : undefined,
        ...NO_TAP_HIGHLIGHT,
      }}
    >
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          transform: isTab && isActive ? 'translateY(-1px)' : 'translateY(0)',
          transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {Icon ? <Icon size={iconSize} /> : label}
      </span>
    </Button>
  );
};
