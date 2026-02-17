import React from 'react';
import { SliderControl } from './SliderControl';
import { formatPercent } from '../utils/coreHelpers';

interface PercentSliderControlProps {
  icon?: React.ReactNode;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  title?: string;
  minWidth?: string;
  labelWidth?: string;
  valueWidth?: string;
  marginBottom?: string;
  inline?: boolean;
  gap?: string;
  decimals?: number;
}

/**
 * A slider control specifically for percentage values (0.0 to 1.0).
 * Automatically formats values as percentages and uses appropriate defaults.
 */
export const PercentSliderControl: React.FC<PercentSliderControlProps> = ({
  step = 0.1,
  decimals = 0,
  ...props
}) => {
  return (
    <SliderControl
      {...props}
      min={0}
      max={1}
      step={step}
      formatter={(value) => formatPercent(value, decimals)}
    />
  );
};
