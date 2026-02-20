/**
 * IconButton component theme for VectorNest
 * Used extensively in tool grid and panel actions
 */

export const IconButton = {
  baseStyle: {
    borderRadius: 'base',
    transition: 'all 0.1s ease',
    border: 'none',
    _focusVisible: {
      boxShadow: 'outline',
    },
  },

  sizes: {
    xs: {
      w: '20px',
      h: '20px',
      minW: '20px',
      fontSize: 'xs',
      p: 0.5,
    },
    sm: {
      w: '32px',
      h: '32px',
      minW: '32px',
      fontSize: 'sm',
      p: 1,
    },
    md: {
      w: '36px',
      h: '36px',
      minW: '36px',
      fontSize: 'md',
      p: 1.5,
    },
    lg: {
      w: '40px',
      h: '40px',
      minW: '40px',
      fontSize: 'lg',
      p: 2,
    },
  },

  variants: {
    // Tool grid button style
    tool: {
      bg: 'sidebar.toolBg',
      color: 'gray.700',
      _hover: {
        bg: 'sidebar.toolHover',
        _disabled: {
          bg: 'sidebar.toolBg',
        },
      },
      _active: {
        bg: 'brand.500',
        color: 'white',
      },
      // Custom prop for "isActive" state
      '&[data-active="true"]': {
        bg: 'brand.500',
        color: 'white',
      },
      _disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
        color: 'gray.500',
      },
    },

    // Panel action button style (for panel headers, etc.)
    panelAction: {
      bg: 'transparent',
      color: 'gray.600',
      _hover: {
        bg: 'gray.100',
        color: 'gray.700',
      },
      _active: {
        bg: 'gray.200',
      },
      _disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
    },

    // Ghost variant for minimal buttons
    ghost: {
      bg: 'transparent',
      color: 'gray.700',
      _hover: {
        bg: 'gray.100',
      },
      _active: {
        bg: 'gray.200',
      },
    },

    // Solid variant for emphasized actions
    solid: {
      bg: 'gray.100',
      color: 'gray.700',
      _hover: {
        bg: 'gray.200',
      },
      _active: {
        bg: 'gray.300',
      },
    },
  },

  defaultProps: {
    size: 'md',
    variant: 'tool',
  },
}
