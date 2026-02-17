import React from 'react';
import { Switch, type SwitchProps } from '@chakra-ui/react';
import { useThemeColors } from '../hooks';

export interface PanelSwitchProps extends Omit<SwitchProps, 'isChecked' | 'onChange'> {
  isChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Reusable switch component for plugin panels
 * Provides consistent gray-toned styling across light and dark modes
 * Used in Edit panel for Add Point and Smooth Brush toggles
 */
export const PanelSwitch: React.FC<PanelSwitchProps> = ({
  isChecked,
  onChange,
  ...restProps
}) => {
  const { panelSwitch } = useThemeColors();
  
  return (
    <Switch
      isChecked={isChecked}
      onChange={onChange}
      size="sm"
      sx={{
        '& .chakra-switch__track': {
          bg: isChecked ? panelSwitch.trackChecked : panelSwitch.trackUnchecked,
          _checked: {
            bg: panelSwitch.trackChecked,
          },
        },
        '& .chakra-switch__thumb': {
          bg: panelSwitch.thumbBg,
        },
      }}
      {...restProps}
    />
  );
};
