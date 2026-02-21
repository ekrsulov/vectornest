import React from 'react';
import { Button } from '@chakra-ui/react';
import { useThemeColors } from '../hooks';

interface PanelTextActionButtonProps {
  label: string;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  isDisabled?: boolean;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

/**
 * Text-based action button for panel operations (generate, apply, randomize, etc.)
 * Replaces icon-only PanelActionButton when a visible text label is desired.
 *
 * variant="primary"   → bordered, slightly accented — use for main generate/apply action
 * variant="secondary" → subdued ghost style       — use for auxiliary actions like random seed
 */
export const PanelTextActionButton: React.FC<PanelTextActionButtonProps> = ({
  label,
  onClick,
  isDisabled = false,
  variant = 'primary',
  fullWidth = true,
}) => {
  const { panelAction } = useThemeColors();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(e);
  };

  const isPrimary = variant === 'primary';

  return (
    <Button
      size="xs"
      variant="unstyled"
      w={fullWidth ? 'full' : 'auto'}
      h="22px"
      px={3}
      borderRadius="full"
      fontWeight="medium"
      fontSize="10px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      opacity={isDisabled ? 0.45 : 1}
      border={isPrimary ? '1px solid' : '1px solid transparent'}
      borderColor={isPrimary ? 'gray.400' : 'transparent'}
      bg="transparent"
      color={isPrimary ? 'gray.700' : 'gray.500'}
      transition="all 0.15s"
      _hover={
        isDisabled
          ? {}
          : {
              bg: isPrimary ? 'gray.50' : panelAction.hoverBg,
              borderColor: isPrimary ? 'gray.500' : 'transparent',
            }
      }
      _active={isDisabled ? {} : { bg: panelAction.activeBg }}
      _dark={{
        color: isPrimary ? 'gray.200' : 'gray.400',
        borderColor: isPrimary ? 'whiteAlpha.300' : 'transparent',
        _hover: isDisabled
          ? {}
          : {
              bg: isPrimary ? 'whiteAlpha.100' : panelAction.hoverBg,
              borderColor: isPrimary ? 'whiteAlpha.500' : 'transparent',
            },
        _active: isDisabled ? {} : { bg: panelAction.activeBg },
      }}
      isDisabled={isDisabled}
      onClick={handleClick}
      aria-label={label}
    >
      {label}
    </Button>
  );
};
