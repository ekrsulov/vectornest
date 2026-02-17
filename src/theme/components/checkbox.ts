/**
 * Checkbox component theme for TTPE
 * Used in settings and file panels
 */

export const Checkbox = {
  baseStyle: {
    control: {
      borderRadius: 'sm',
      border: '1px solid',
      borderColor: 'gray.300',
      _dark: {
        borderColor: 'whiteAlpha.500',
      },
      transition: 'all 0.2s ease',
      _checked: {
        bg: 'brand.500',
        borderColor: 'brand.500',
        color: 'white',
        _hover: {
          bg: 'brand.600',
          borderColor: 'brand.600',
        },
      },
      _focusVisible: {
        boxShadow: 'outline',
      },
      _disabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
      },
    },
    label: {
      fontSize: 'sm',
      color: 'gray.700',
      _dark: {
        color: 'gray.200',
      },
      ml: 2,
      _disabled: {
        opacity: 0.6,
      },
    },
  },

  sizes: {
    sm: {
      control: {
        w: '14px',
        h: '14px',
      },
      label: {
        fontSize: 'sm',
      },
    },
    md: {
      control: {
        w: '16px',
        h: '16px',
      },
      label: {
        fontSize: 'sm',
      },
    },
  },

  defaultProps: {
    size: 'sm',
    colorScheme: 'brand',
  },
}
