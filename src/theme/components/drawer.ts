/**
 * Drawer component theme for TTPE
 * Used for mobile sidebar rendering
 */

export const Drawer = {
  baseStyle: {
    dialog: {
      bg: 'sidebar.bg',
      backdropFilter: 'blur(10px)',
    },
    header: {
      px: 2,
      py: 2,
      borderBottom: '1px solid',
      borderColor: 'sidebar.divider',
    },
    body: {
      px: 0,
      py: 0,
    },
    footer: {
      px: 2,
      py: 2,
      borderTop: '1px solid',
      borderColor: 'sidebar.divider',
    },
  },

  sizes: {
    xs: {
      dialog: { maxW: '200px' },
    },
    sm: {
      dialog: { maxW: '250px' }, // Current sidebar width
    },
    md: {
      dialog: { maxW: '300px' },
    },
    lg: {
      dialog: { maxW: '350px' },
    },
  },

  variants: {
    sidebar: {
      dialog: {
        maxW: '250px',
      },
      body: {
        p: 0,
        display: 'flex',
        flexDirection: 'column',
      },
    },
  },

  defaultProps: {
    size: 'sm',
  },
}
