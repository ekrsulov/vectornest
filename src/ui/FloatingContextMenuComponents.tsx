import React from 'react';
import { Box, HStack, Text, IconButton } from '@chakra-ui/react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { FloatingContextMenuAction } from '../types/plugins';
import { useThemeColors, NO_FOCUS_STYLES } from '../hooks';
import { NO_TAP_HIGHLIGHT } from '../constants';

/**
 * Renders a menu icon with special handling for specific actions (e.g., send-back rotation).
 */
// eslint-disable-next-line react-refresh/only-export-components
export const renderMenuIcon = (action: FloatingContextMenuAction) => {
  if (action.id === 'send-back') {
    return (
      <Box transform="rotate(180deg)">
        <action.icon size={16} />
      </Box>
    );
  }
  return <action.icon size={16} />;
};

/**
 * Shared style props for Chakra MenuItem components.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function menuItemChakraStyleProps(action: FloatingContextMenuAction, theme: ReturnType<typeof useThemeColors>) {
  return {
    color: action.variant === 'danger' ? theme.menu.dangerColor : theme.menu.iconColor,
    _hover: !action.isDisabled ? {
      bg: action.variant === 'danger' ? theme.menu.dangerHoverBg : theme.menu.hoverBg
    } : {},
    _focus: { outline: 'none', boxShadow: 'none', bg: 'transparent' },
    _active: { outline: 'none', bg: 'transparent' },
    sx: {
      ...NO_TAP_HIGHLIGHT,
      ...NO_FOCUS_STYLES,
    },
    fontSize: "14px",
  };
}

/**
 * Shared style props for menu items to ensure consistency across mobile and desktop.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function menuItemStyleProps(action: FloatingContextMenuAction, theme: ReturnType<typeof useThemeColors>) {
  return {
    px: 3,
    py: 2,
    w: "full",
    display: "flex",
    alignItems: "center",
    gap: 2,
    transition: "all 0.2s",
    bg: "transparent",
    color: action.variant === 'danger' ? theme.menu.dangerColor : theme.menu.iconColor,
    opacity: action.isDisabled ? 0.4 : 1,
    cursor: action.isDisabled ? 'not-allowed' : 'pointer',
    _hover: !action.isDisabled ? {
      bg: action.variant === 'danger' ? theme.menu.dangerHoverBg : theme.menu.hoverBg
    } : {},
    _focus: { outline: 'none', boxShadow: 'none' },
    _active: { outline: 'none' },
    sx: {
      ...NO_TAP_HIGHLIGHT,
      ...NO_FOCUS_STYLES,
    },
    fontSize: "14px",
    fontWeight: "medium",
  };
}

interface FloatingContextMenuItemProps {
  action: FloatingContextMenuAction;
  onNavigateToSubmenu?: (action: FloatingContextMenuAction) => void;
  isMobile?: boolean;
}

/**
 * Individual menu item for FloatingContextMenu.
 * Handles both regular actions and submenu triggers.
 */
export const FloatingContextMenuItem: React.FC<FloatingContextMenuItemProps> = ({
  action,
  onNavigateToSubmenu,
  isMobile = false,
}) => {
  const theme = useThemeColors();

  const hasSubmenu = action.submenu && action.submenu.length > 0;

  const handleClick = () => {
    if (hasSubmenu && isMobile && onNavigateToSubmenu) {
      onNavigateToSubmenu(action);
    } else if (action.onClick) {
      action.onClick();
    }
  };

  return (
    <Box
      as="button"
      onClick={handleClick}
      disabled={action.isDisabled}
      {...menuItemStyleProps(action, theme)}
    >
      {renderMenuIcon(action)}
      <Box flex="1" textAlign="left">{action.label}</Box>
      {hasSubmenu && (
        <Box flexShrink={0}>
          <ChevronRight size={14} />
        </Box>
      )}
    </Box>
  );
};

interface FloatingContextMenuMobileSubmenuProps {
  parentAction: FloatingContextMenuAction;
  onBack: () => void;
}

/**
 * Mobile submenu view for FloatingContextMenu.
 * Shows a header with back button and the submenu items.
 */
export const FloatingContextMenuMobileSubmenu: React.FC<FloatingContextMenuMobileSubmenuProps> = ({
  parentAction,
  onBack,
}) => {
  const theme = useThemeColors();

  if (!parentAction.submenu) return null;

  return (
    <>
      {/* Header with back button and title */}
      <HStack
        px={2}
        py={2}
        spacing={1}
        borderBottom="1px solid"
        borderColor={theme.menu.borderColor}
      >
        <IconButton
          icon={<ChevronLeft size={18} />}
          aria-label="Back to main menu"
          size="sm"
          variant="ghost"
          onClick={onBack}
          minW="auto"
          h="auto"
          p={1}
          _focus={{ outline: 'none', boxShadow: 'none' }}
          _active={{ outline: 'none' }}
        />
        <Text fontSize="12px" fontWeight="semibold" color={theme.menu.iconColor} flex="1">
          {parentAction.label}
        </Text>
      </HStack>

      {/* Submenu items */}
      {parentAction.submenu.map(subAction => {
        return (
          <Box
            key={subAction.id}
            as="button"
            onClick={subAction.onClick}
            disabled={subAction.isDisabled}
            {...menuItemStyleProps(subAction, theme)}
          >
            {renderMenuIcon(subAction)}
            <span>{subAction.label}</span>
          </Box>
        );
      })}
    </>
  );
};
