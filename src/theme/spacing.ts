/**
 * Spacing configuration for TTPE application
 * Based on existing gap/padding patterns (2px, 4px, 6px, 8px)
 */

/**
 * Panel spacing values for consistent panel separation
 */
export const panelSpacing = {
  /** Vertical spacing between panels (margin-top) - responsive: [mobile, desktop] */
  betweenPanels: ['4px', '8px'], // [spacing.1 or mt={1} on mobile, spacing.2 or mt={2} on desktop]
};

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '2px',   // Micro gaps (existing 2px)
  1: '4px',     // Small gaps (existing 4px)
  1.5: '6px',   // Medium-small (existing 6px)
  2: '8px',     // Standard gap (existing 8px)
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
}

/**
 * Radii (border radius) values
 */
export const radii = {
  none: '0',
  sm: '2px',
  base: '3px',   // IconButton current radius
  md: '4px',     // Panel header current radius
  lg: '6px',
  xl: '8px',
  '2xl': '12px',
  '3xl': '16px',
  full: '9999px', // Circular buttons (50%)
}

/**
 * Shadow values for depth
 */
export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  outline: '0 0 0 3px rgba(0, 123, 255, 0.5)', // Focus ring with brand color
  none: 'none',
}

/**
 * Z-index scale for layering
 */
export const zIndices = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,

  // Custom for TTPE
  expandableToolPanel: 850,  // Below BottomActionBar so it doesn't block menus
  floatingToolbarBottom: 900,
  floatingToolbarTop: 999,
  sidebar: 1000,      // Current sidebar z-index
  sidebarFooter: 1001, // Current footer z-index
  debugBadge: 10000,   // RenderCountBadge for debugging
}
