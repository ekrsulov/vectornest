import React from 'react';
import { Checkbox as ChakraCheckbox } from '@chakra-ui/react';
import { useThemeColors } from '../hooks';

export interface PanelToggleProps {
  isChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * Reusable checkbox component for plugin panels
 * Provides consistent styling across Guidelines, Grid, and other panels
 */
export const PanelToggle: React.FC<PanelToggleProps> = ({
  isChecked,
  onChange,
  isDisabled = false,
  children
}) => {
  const { panelToggle } = useThemeColors();

  return (
    <ChakraCheckbox
      isChecked={isChecked}
      onChange={onChange}
      isDisabled={isDisabled}
      size="sm"
      sx={{
        '& .chakra-checkbox__control': {
          borderRadius: 'full',
          bg: isChecked ? panelToggle.checkedBg : 'transparent',
          borderColor: isChecked ? panelToggle.checkedBorder : panelToggle.borderColor,
          _checked: {
            bg: panelToggle.checkedBg,
            borderColor: panelToggle.checkedBorder,
            color: panelToggle.checkedColor,
            _hover: {
              bg: panelToggle.checkedHoverBg,
              borderColor: panelToggle.checkedHoverBorder,
            }
          },
          _hover: {
            bg: isChecked ? panelToggle.checkedHoverBg : panelToggle.hoverBg,
            borderColor: isChecked ? panelToggle.checkedHoverBorder : panelToggle.borderColor,
            _dark: {
              bg: isChecked ? 'gray.500' : 'whiteAlpha.100',
              borderColor: isChecked ? 'gray.500' : 'whiteAlpha.500',
            },
          },
          _disabled: {
            opacity: 0.4,
            cursor: 'not-allowed',
          },
          _dark: {
            borderColor: isChecked ? 'gray.400' : 'whiteAlpha.500',
          },
        },
        '& .chakra-checkbox__label': {
          color: panelToggle.textColor,
        }
      }}
    >
      {children}
    </ChakraCheckbox>
  );
};
