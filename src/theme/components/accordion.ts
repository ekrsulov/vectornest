/**
 * Accordion component theme for TTPE
 * Used for collapsible panels like ArrangePanel
 */

export const Accordion = {
  baseStyle: {
    container: {
      borderColor: 'transparent',
    },
    button: {
      fontSize: 'sm',
      fontWeight: 'extrabold',
      color: 'gray.700',
      px: 0,
      py: 1,
      bg: 'transparent',
      borderRadius: 'md',
      transition: 'all 0.2s ease',
      _hover: {
        bg: 'gray.200',
      },
      _expanded: {
        bg: 'transparent',
      },
      _focusVisible: {
        boxShadow: 'outline',
      },
    },
    panel: {
      pt: 2,
      px: 2,
      pb: 2,
    },
    icon: {
      color: 'gray.600',
    },
  },

  variants: {
    // Sidebar panel style
    sidebar: {
      container: {
        bg: 'surface.panel',
        mb: 0.5,
      },
      button: {
        _hover: {
          bg: 'gray.200',
          _dark: { bg: 'whiteAlpha.200' },
        },
      },
      panel: {
        bg: 'surface.panel',
      },
    },

    // Footer panel style (for ArrangePanel)
    footer: {
      container: {
        bg: 'surface.panel',
        borderTop: '1px solid',
        borderColor: 'sidebar.divider',
      },
      button: {
        borderRadius: 0,
      },
      panel: {
        bg: 'surface.panel',
      },
    },
  },

  defaultProps: {
    variant: 'sidebar',
    allowToggle: true,
  },
}
