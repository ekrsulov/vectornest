import React from 'react';
import { HStack, VStack } from '@chakra-ui/react';
import { PanelToggle } from './PanelToggle';

export interface ToggleConfig {
  label: string;
  isChecked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDisabled?: boolean;
}

interface PanelToggleGroupProps {
  /**
   * Array of toggle configurations
   */
  toggles: ToggleConfig[];
  /**
   * Layout direction
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical';
  /**
   * Spacing between toggles
   * @default 4
   */
  spacing?: number;
}

/**
 * Renders a group of PanelToggle components in a horizontal or vertical layout
 * Used to reduce boilerplate when creating multiple related toggles
 */
export const PanelToggleGroup: React.FC<PanelToggleGroupProps> = ({
  toggles,
  direction = 'horizontal',
  spacing = 4,
}) => {
  const Container = direction === 'horizontal' ? HStack : VStack;

  return (
    <Container spacing={spacing} align="stretch">
      {toggles.map((toggle, index) => (
        <PanelToggle
          key={index}
          isChecked={toggle.isChecked}
          onChange={toggle.onChange}
          isDisabled={toggle.isDisabled}
        >
          {toggle.label}
        </PanelToggle>
      ))}
    </Container>
  );
};
