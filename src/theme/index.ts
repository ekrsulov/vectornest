/**
 * Main theme configuration for VectorNest application
 * Extends Chakra UI's default theme with custom tokens
 */

import { extendTheme, type ThemeConfig } from '@chakra-ui/react'
import { mode, type StyleFunctionProps } from '@chakra-ui/theme-tools'
import { colors } from './colors'
import { components } from './components'
import { typography, textStyles } from './typography'
import { spacing, radii, shadows, zIndices } from './spacing'

// Color mode configuration
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
}

// Extend Chakra's base theme
export const theme = extendTheme({
  config,

  // Design tokens
  colors,
  semanticTokens: {
    colors: {
      'surface.canvas': {
        default: 'gray.50',
        _dark: 'gray.900',
      },
      'surface.panel': {
        default: 'white',
        _dark: 'gray.800',
      },
      'surface.panelSecondary': {
        default: 'gray.50',
        _dark: 'gray.700',
      },
      'surface.sidebar': {
        default: 'rgba(249, 249, 249, 0.95)',
        _dark: 'rgba(26, 32, 44, 0.92)',
      },
      'surface.sidebarHeader': {
        default: 'gray.100',
        _dark: 'whiteAlpha.200',
      },
      'surface.toolbar': {
        default: 'rgba(255, 255, 255, 0.95)',
        _dark: 'rgba(26, 32, 44, 0.85)',
      },
      'surface.toolbarHover': {
        default: 'gray.50',
        _dark: 'whiteAlpha.100',
      },
      'border.sidebar': {
        default: 'gray.200',
        _dark: 'whiteAlpha.300',
      },
      'border.panel': {
        default: 'gray.200',
        _dark: 'whiteAlpha.200',
      },
      'border.toolbar': {
        default: 'rgba(15, 23, 42, 0.05)',
        _dark: 'whiteAlpha.200',
      },
      'text.primary': {
        default: 'gray.800',
        _dark: 'gray.100',
      },
      'text.muted': {
        default: 'gray.600',
        _dark: 'gray.400',
      },
    },
  },
  ...typography,
  space: spacing,
  radii,
  shadows,
  zIndices,
  
  // Text style presets
  textStyles,
  
  // Component customizations
  components,
  
  // Global styles
  styles: {
    global: (props: StyleFunctionProps) => ({
      body: {
        bg: mode('surface.canvas', 'surface.canvas')(props),
        color: mode('text.primary', 'text.primary')(props),
        fontFamily: 'body',
        fontSize: 'sm',
        lineHeight: 'normal',
      },
      // Smooth scrolling for panels
      '*': {
        scrollBehavior: 'smooth',
      },
      // Custom scrollbar for panels
      '*::-webkit-scrollbar': {
        width: '8px',
      },
      '*::-webkit-scrollbar-track': {
        bg: mode('gray.100', 'whiteAlpha.200')(props),
      },
      '*::-webkit-scrollbar-thumb': {
        bg: mode('gray.300', 'whiteAlpha.400')(props),
        borderRadius: 'md',
      },
      '*::-webkit-scrollbar-thumb:hover': {
        bg: mode('gray.400', 'whiteAlpha.500')(props),
      },
    }),
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    base: '0em',    // 0px
    sm: '30em',     // ~480px
    md: '48em',     // ~768px (tablet)
    lg: '64em',     // ~1024px (desktop)
    xl: '80em',     // ~1280px
    '2xl': '96em',  // ~1536px
  },
})

// Internal type - not consumed externally
// export type Theme = typeof theme
