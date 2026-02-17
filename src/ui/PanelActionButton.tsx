import React from 'react';
import { IconButton as ChakraIconButton } from '@chakra-ui/react';
import type { LucideIcon } from 'lucide-react';
import ConditionalTooltip from './ConditionalTooltip';
import { useThemeColors } from '../hooks';

interface PanelActionButtonProps {
  label: string;
  icon: LucideIcon;
  iconSize?: number;
  height?: string;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  isDisabled?: boolean;
  variant?: 'ghost' | 'solid' | 'outline' | 'link';
  tooltipDelay?: number;
}

export const PanelActionButton: React.FC<PanelActionButtonProps> = ({
  label,
  icon: Icon,
  iconSize = 12,
  height = '20px',
  onClick,
  isDisabled = false,
  variant = 'ghost',
  tooltipDelay = 200,
}) => {
  const { panelAction } = useThemeColors();
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(e);
  };

  return (
    <ConditionalTooltip label={label} openDelay={tooltipDelay}>
      <ChakraIconButton
        aria-label={label}
        icon={<Icon size={iconSize} />}
        size="xs"
        variant={variant}
        minW="auto"
        h={height}
        p={1}
        borderRadius="full"
        onClick={handleClick}
        isDisabled={isDisabled}
        border="none"
        color={panelAction.iconColor}
        _hover={{ bg: panelAction.hoverBg }}
        _active={{ bg: panelAction.activeBg }}
      />
    </ConditionalTooltip>
  );
};
