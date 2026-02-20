/**
 * Button component theme for VectorNest
 * Customized for sidebar buttons and form controls
 */

export const Button = {
  baseStyle: {
    fontWeight: 'medium',
    borderRadius: 'base',
    transition: 'all 0.2s ease',
    _focusVisible: {
      boxShadow: 'outline',
    },
  },

  sizes: {
    xs: {
      fontSize: 'xs',
      px: 2,
      py: 1,
      h: '24px',
    },
    sm: {
      fontSize: 'sm',
      px: 3,
      py: 2,
      h: '32px',
    },
    md: {
      fontSize: 'sm',
      px: 4,
      py: 2,
      h: '36px',
    },
    lg: {
      fontSize: 'md',
      px: 5,
      py: 3,
      h: '40px',
    },
  },

  variants: {
    // Default sidebar button style (secondary)
    sidebar: {
      bg: 'gray.100',
      color: 'gray.700',
      border: '1px solid',
      borderColor: 'gray.300',
      _hover: {
        bg: 'gray.200',
        _disabled: {
          bg: 'gray.100',
        },
      },
      _dark: {
        bg: 'gray.700',
        color: 'gray.200',
        borderColor: 'whiteAlpha.300',
        _hover: {
          bg: 'gray.600',
          _disabled: {
            bg: 'gray.700',
          },
        },
      },
      _active: {
        bg: 'gray.300',
        _dark: {
          bg: 'gray.500',
        },
      },
      _disabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
      },
    },

    // Primary sidebar button (for save, apply, etc.)
    sidebarPrimary: {
      bg: 'brand.500',
      color: 'white',
      border: '1px solid',
      borderColor: 'brand.600',
      _hover: {
        bg: 'brand.600',
        _disabled: {
          bg: 'brand.500',
        },
      },
      _active: {
        bg: 'brand.700',
      },
      _disabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
      },
    },

    // Ghost variant for subtle actions
    sidebarGhost: {
      bg: 'transparent',
      color: 'gray.700',
      _hover: {
        bg: 'gray.100',
      },
      _dark: {
        color: 'gray.200',
        _hover: {
          bg: 'whiteAlpha.200',
        },
      },
      _active: {
        bg: 'gray.200',
        _dark: {
          bg: 'whiteAlpha.300',
        },
      },
    },

    // Outline variant
    sidebarOutline: {
      bg: 'transparent',
      border: '1px solid',
      borderColor: 'gray.300',
      color: 'gray.700',
      _hover: {
        bg: 'gray.50',
      },
      _dark: {
        borderColor: 'whiteAlpha.300',
        color: 'gray.200',
        _hover: {
          bg: 'whiteAlpha.100',
        },
      },
      _active: {
        bg: 'gray.100',
        _dark: {
          bg: 'whiteAlpha.200',
        },
      },
    },
  },

  defaultProps: {
    size: 'sm',
    variant: 'sidebar',
  },
}
