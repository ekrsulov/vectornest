import React from 'react';
import { IconButton as ChakraIconButton, Button } from '@chakra-ui/react';
import type { SystemStyleObject } from '@chakra-ui/react';
import ConditionalTooltip from './ConditionalTooltip';

interface ToggleButtonProps {
  isActive: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  icon?: React.ReactElement;
  'aria-label': string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text';
  isDisabled?: boolean;
  sx?: SystemStyleObject;
  showTooltip?: boolean;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  isActive,
  onClick,
  children,
  icon,
  'aria-label': ariaLabel,
  title,
  size = 'sm',
  variant = 'icon',
  isDisabled = false,
  sx,
  showTooltip = true,
}) => {
  const isTextVariant = variant === 'text';
  const baseFontSize = size === 'sm' ? '10px' : size === 'md' ? '11px' : '12px';
  const resolvedFontSize: string | number =
    typeof sx?.fontSize === 'string' || typeof sx?.fontSize === 'number'
      ? sx.fontSize
      : baseFontSize;

  const commonProps = {
    'aria-label': ariaLabel,
    title,
    variant: 'unstyled' as const,
    size,
    isDisabled,
    bg: isTextVariant ? 'transparent' : (isActive ? 'gray.600' : 'transparent'),
    color: isTextVariant ? 'gray.700' : (isActive ? 'white' : 'gray.700'),
    border: '1px solid',
    borderColor: 'gray.400',
    borderRadius: 'full',
    fontSize: resolvedFontSize,
    fontWeight: 'medium' as const,
    transition: 'all 0.2s',
    textDecoration: isTextVariant && isActive ? 'underline' : 'none',
    _hover: isTextVariant
      ? {
        bg: 'gray.50'
      }
      : {
        bg: isActive ? 'gray.700' : 'gray.50'
      },
    _dark: {
      bg: isTextVariant ? 'transparent' : (isActive ? 'gray.400' : 'transparent'),
      color: isTextVariant ? 'gray.200' : (isActive ? 'gray.800' : 'gray.400'),
      borderColor: 'whiteAlpha.400',
      _hover: isTextVariant
        ? {
          bg: 'whiteAlpha.100'
        }
        : {
          bg: isActive ? 'gray.500' : 'whiteAlpha.100'
        }
    },
    sx: {
      minH: size === 'sm' ? '20px' : size === 'md' ? '24px' : '28px',
      h: size === 'sm' ? '20px' : size === 'md' ? '24px' : '28px',
      px: 1,
      py: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...(variant === 'icon' && {
        w: size === 'sm' ? '20px' : size === 'md' ? '24px' : '28px',
        minW: size === 'sm' ? '20px' : size === 'md' ? '24px' : '28px',
      }),
      ...sx
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick();
  };

  const renderButton = () =>
    variant === 'icon' && icon ? (
      <ChakraIconButton
        {...commonProps}
        icon={icon}
        onClick={handleClick}
      />
    ) : (
      <Button {...commonProps} onClick={handleClick}>
        {children}
      </Button>
    );

  if (!showTooltip) {
    return renderButton();
  }

  return (
    <ConditionalTooltip label={ariaLabel} shouldWrapChildren={isDisabled}>
      {renderButton()}
    </ConditionalTooltip>
  );
};
