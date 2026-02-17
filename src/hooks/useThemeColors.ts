/**
 * Unified theme colors hook
 * Consolidates all color hooks into a single source of truth.
 * 
 * Usage:
 *   const { toolbar, menu, panel, toggle, input, ruler } = useThemeColors();
 *   // or
 *   const colors = useThemeColors();
 *   colors.toolbar.bg // toolbar background
 */

import { useColorMode } from '@chakra-ui/react';
import { useMemo } from 'react';

/**
 * Main unified theme colors hook.
 * Returns all color categories in a single call to minimize hook overhead.
 */
export function useThemeColors() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return useMemo(() => ({
    // Toolbar colors (FloatingToolbarShell, ToolbarIconButton)
    toolbar: {
      bg: 'surface.toolbar',
      color: isDark ? 'gray.100' : 'gray.700',
      borderColor: 'border.toolbar',
      borderWidth: isDark ? '1px' : '0px',
      shadow: isDark ? 'none' : '0px 0px 10px 2px rgba(0, 0, 0, 0.1)',
    },

    // Menu colors (FloatingContextMenu, dropdowns)
    menu: {
      bg: isDark ? 'gray.800' : 'white',
      borderColor: isDark ? 'gray.600' : 'gray.200',
      hoverBg: isDark ? 'gray.700' : 'gray.50',
      iconColor: isDark ? 'gray.300' : 'gray.700',
      dangerColor: isDark ? 'red.400' : 'red.500',
      dangerHoverBg: isDark ? 'rgba(239, 68, 68, 0.1)' : 'red.50',
    },

    // Panel header colors
    panelHeader: {
      hoverBg: isDark ? 'whiteAlpha.200' : 'gray.200',
      iconColor: isDark ? 'gray.300' : 'gray.600',
      titleColor: 'text.primary',
    },

    // Counter badge colors (toolbar buttons)
    counter: {
      neutral: {
        bg: isDark ? 'whiteAlpha.200' : 'gray.50',
        color: isDark ? 'gray.200' : 'gray.600',
      },
      danger: {
        bg: isDark ? 'whiteAlpha.200' : 'gray.50',
        color: isDark ? 'whiteAlpha.900' : 'red.500',
      },
    },

    // Panel button colors (ArrangePanel, etc.)
    panelButton: {
      color: isDark ? 'gray.100' : 'gray.700',
      hoverBg: isDark ? 'whiteAlpha.200' : 'gray.100',
      activeBg: isDark ? 'whiteAlpha.300' : 'gray.200',
      panelBg: 'surface.panel',
      borderColor: isDark ? 'whiteAlpha.300' : 'gray.200',
    },

    // Expandable panel colors
    expandable: {
      bg: isDark ? 'rgba(26, 32, 44, 1)' : 'rgba(255, 255, 255, 1)',
      borderColor: isDark ? 'gray.700' : 'gray.200',
      iconColor: isDark ? 'gray.300' : 'gray.600',
      hoverBg: isDark ? 'gray.700' : 'gray.50',
    },

    // Form input colors (selects, inputs)
    input: {
      bg: isDark ? 'whiteAlpha.100' : 'white',
      menuBg: isDark ? 'gray.800' : 'white',
      borderColor: isDark ? 'whiteAlpha.300' : 'gray.300',
      textColor: isDark ? 'gray.100' : 'gray.800',
      hoverBg: isDark ? 'whiteAlpha.200' : 'gray.50',
      selectedBg: isDark ? 'gray.700' : 'gray.200',
      selectedColor: isDark ? 'gray.200' : 'gray.800',
      placeholderColor: 'gray.500',
    },

    // Toggle button colors (active/inactive states)
    toggle: {
      inactive: {
        bg: 'transparent',
        hoverBg: isDark ? 'whiteAlpha.100' : 'gray.50',
        color: isDark ? 'gray.200' : 'gray.700',
        border: isDark ? 'whiteAlpha.300' : 'gray.400',
      },
      active: {
        bg: isDark ? 'gray.200' : 'gray.800',
        color: isDark ? 'gray.900' : 'white',
        hoverBg: isDark ? 'gray.200' : 'gray.800',
      },
    },

    // Active tool colors (TopActionBar animated background)
    activeTool: {
      bg: isDark ? 'gray.200' : 'gray.800',
      color: isDark ? 'gray.900' : 'white',
    },

    // Ruler colors
    ruler: {
      bg: isDark ? 'gray.800' : 'gray.100',
      textColor: isDark ? 'gray.400' : 'gray.600',
      tickColor: isDark ? 'gray.500' : 'gray.400',
      borderColor: isDark ? 'gray.600' : 'gray.300',
      // Raw hex values for canvas rendering
      bgHex: isDark ? '#1a202c' : '#f7fafc',
      textHex: isDark ? '#a0aec0' : '#718096',
      tickHex: isDark ? '#718096' : '#a0aec0',
      borderHex: isDark ? '#4a5568' : '#e2e8f0',
    },

    // Panel toggle (checkbox) colors
    panelToggle: {
      borderColor: isDark ? 'whiteAlpha.500' : 'gray.400',
      hoverBg: isDark ? 'whiteAlpha.100' : 'gray.50',
      textColor: isDark ? 'gray.400' : 'gray.600',
      checkedBg: isDark ? 'gray.400' : 'gray.600',
      checkedBorder: isDark ? 'gray.400' : 'gray.600',
      checkedHoverBg: isDark ? 'gray.500' : 'gray.700',
      checkedHoverBorder: isDark ? 'gray.500' : 'gray.700',
      checkedColor: isDark ? 'gray.800' : 'white',
    },

    // Panel action button colors
    panelAction: {
      hoverBg: isDark ? 'whiteAlpha.400' : 'gray.300',
      activeBg: isDark ? 'whiteAlpha.500' : 'gray.400',
      iconColor: isDark ? 'gray.200' : 'gray.600',
    },

    // Panel switch colors
    panelSwitch: {
      trackUnchecked: isDark ? 'gray.600' : 'gray.300',
      trackChecked: isDark ? 'gray.400' : 'gray.500',
      thumbBg: isDark ? 'gray.100' : 'white',
    },
  }), [isDark]);
}

/**
 * Focused styles that should be applied consistently to remove focus outlines.
 * Extract as constant to avoid duplication across components.
 */
export const NO_FOCUS_STYLES = {
  '&:focus': { outline: 'none !important', boxShadow: 'none !important' },
  '&:focus-visible': { outline: 'none !important', boxShadow: 'none !important' },
} as const;

/**
 * Extended no-focus styles including nested elements.
 * Used in containers like menus and popovers.
 */
export const NO_FOCUS_STYLES_DEEP = {
  ...NO_FOCUS_STYLES,
  '& *:focus': { outline: 'none !important' },
  '& *:focus-visible': { outline: 'none !important' },
} as const;
