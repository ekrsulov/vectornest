/**
 * Typography configuration for TTPE application
 * Maintains existing font stack and sizes
 */

export const typography = {
  fonts: {
    heading: "system-ui, Avenir, Helvetica, Arial, sans-serif",
    body: "system-ui, Avenir, Helvetica, Arial, sans-serif",
    mono: "Menlo, Monaco, 'Courier New', monospace",
  },

  fontSizes: {
    xs: '10px',   // Extra small (icons in tight spaces)
    sm: '12px',   // Small - PRIMARY UI text size
    md: '14px',   // Medium - Secondary text, icons
    lg: '16px',   // Large - Headers
    xl: '18px',   // Extra large
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '28px',
    '5xl': '32px',
  },

  fontWeights: {
    hairline: 100,
    thin: 200,
    light: 300,
    normal: 400,    // Default text
    medium: 500,    // Emphasized text
    semibold: 600,
    bold: 700,
    extrabold: 800, // Panel headers (current 800)
    black: 900,
  },

  lineHeights: {
    none: 1,
    shorter: 1.2,
    short: 1.375,
    normal: 1.5,    // Default line height
    tall: 1.625,
    taller: 2,
  },

  letterSpacings: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
}

/**
 * Text style presets for common use cases
 */
export const textStyles = {
  panelTitle: {
    fontSize: 'sm',
    fontWeight: 'extrabold',
    color: 'gray.700',
    lineHeight: 'shorter',
  },
  panelBody: {
    fontSize: 'sm',
    fontWeight: 'normal',
    color: 'gray.800',
    lineHeight: 'normal',
  },
  badge: {
    fontSize: 'xs',
    fontWeight: 'medium',
    color: 'gray.600',
    lineHeight: 'none',
  },
  buttonLabel: {
    fontSize: 'sm',
    fontWeight: 'medium',
    lineHeight: 'shorter',
  },
}
