import React, { useState } from 'react';
import { Box, VStack, Divider, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import ConditionalTooltip from './ConditionalTooltip';
import { ChevronRight } from 'lucide-react';
import type { FloatingContextMenuAction } from '../types/plugins';
import { useThemeColors } from '../hooks';
import { useResponsive, NO_FOCUS_STYLES, NO_FOCUS_STYLES_DEEP } from '../hooks';
import { FloatingContextMenuItem, FloatingContextMenuMobileSubmenu, renderMenuIcon, menuItemChakraStyleProps } from './FloatingContextMenuComponents';

interface FloatingContextMenuProps {
  /** Array of actions to display in the menu */
  actions: FloatingContextMenuAction[];
  /** Whether the menu is visible */
  isOpen: boolean;
}

/**
 * Floating Context Menu
 * 
 * A menu that displays contextual actions for selected elements.
 * Used with FloatingContextMenuButton in the bottom action bar.
 * 
 * Refactored to use extracted subcomponents:
 * - FloatingContextMenuItem: Individual menu items
 * - FloatingContextMenuMobileSubmenu: Mobile submenu navigation
 */
export const FloatingContextMenu: React.FC<FloatingContextMenuProps> = ({
  actions,
  isOpen,
}) => {
  const theme = useThemeColors();
  const { menu: { bg, borderColor, hoverBg, iconColor } } = theme;

  // State for mobile submenu navigation
  const [activeSubmenu, setActiveSubmenu] = useState<FloatingContextMenuAction | null>(null);

  // Use unified responsive hook
  const { isMobile } = useResponsive();

  // Use left placement on mobile to prevent cutoff
  const submenuPlacement = isMobile ? 'left-start' : 'right-start';

  if (!isOpen) return null;

  // On mobile, show submenu view if active
  if (isMobile && activeSubmenu) {
    return (
      <VStack
        spacing={0}
        align="stretch"
        bg={bg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="lg"
        minW="180px"
        py={1}
        tabIndex={-1}
        _focus={{ outline: 'none', boxShadow: 'lg' }}
        sx={NO_FOCUS_STYLES_DEEP}
      >
        <FloatingContextMenuMobileSubmenu
          parentAction={activeSubmenu}
          onBack={() => setActiveSubmenu(null)}
        />
      </VStack>
    );
  }

  // Group actions by variant for visual separation
  const defaultActions = actions.filter(a => !a.variant || a.variant === 'default');
  const dangerActions = actions.filter(a => a.variant === 'danger');

  const renderAction = (action: FloatingContextMenuAction) => {
    const hasSubmenu = action.submenu && action.submenu.length > 0;

    // Action with submenu
    if (hasSubmenu) {
      // On mobile, use navigation-based submenu
      if (isMobile) {
        return (
          <FloatingContextMenuItem
            key={action.id}
            action={action}
            onNavigateToSubmenu={setActiveSubmenu}
            isMobile={true}
          />
        );
      }

      // On desktop, use Chakra Menu with nested submenu
      return (
        <Menu key={action.id} placement={submenuPlacement} isLazy>
          <MenuButton
            as={Box}
            px={3}
            py={2}
            w="full"
            borderRadius="md"
            transition="all 0.2s"
            bg="transparent"
            color={iconColor}
            cursor="pointer"
            _hover={{ bg: hoverBg }}
            _focus={{ outline: 'none', boxShadow: 'none' }}
            _active={{ outline: 'none' }}
            sx={NO_FOCUS_STYLES}
            fontSize="14px"
            fontWeight="medium"
          >
            <Box display="flex" alignItems="center" gap={2} w="full">
              <action.icon size={16} />
              <Box flex="1" textAlign="left">{action.label}</Box>
              <Box flexShrink={0}>
                <ChevronRight size={14} />
              </Box>
            </Box>
          </MenuButton>
          <MenuList
            bg={bg}
            borderColor={borderColor}
            boxShadow="lg"
            minW="160px"
            maxW="240px"
            py={1}
            _focus={{ outline: 'none', boxShadow: 'lg' }}
            sx={NO_FOCUS_STYLES}
          >
            {action.submenu!.map(subAction => {
              return (
                <MenuItem
                  key={subAction.id}
                  onClick={subAction.onClick}
                  isDisabled={subAction.isDisabled}
                  icon={renderMenuIcon(subAction)}
                  {...menuItemChakraStyleProps(subAction, theme)}
                >
                  {subAction.label}
                </MenuItem>
              );
            })}
          </MenuList>
        </Menu>
      );
    }

    // Regular action without submenu
    return (
      <ConditionalTooltip key={action.id} label={action.label} placement="right">
        <FloatingContextMenuItem action={action} />
      </ConditionalTooltip>
    );
  };

  return (
    <VStack
      spacing={0}
      align="stretch"
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      boxShadow="lg"
      minW="180px"
      py={1}
      tabIndex={-1}
      _focus={{ outline: 'none', boxShadow: 'lg' }}
      sx={NO_FOCUS_STYLES_DEEP}
    >
      {defaultActions.length > 0 && (
        <>
          {defaultActions.map(renderAction)}
          {dangerActions.length > 0 && <Divider my={1} />}
        </>
      )}
      {dangerActions.map(renderAction)}
    </VStack>
  );
};
