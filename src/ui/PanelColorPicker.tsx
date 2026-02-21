/**
 * PanelColorPicker — reusable inline color swatch + hex display for sidebar panels.
 *
 * Consolidates the repeated pattern of:
 *   <Box display="flex" alignItems="center" gap={1}>
 *     <Text …>Color:</Text>
 *     <Input type="color" …/>
 *     <Text …>{hex}</Text>
 *   </Box>
 */

import React from 'react';
import { Input, Text, HStack } from '@chakra-ui/react';

export interface PanelColorPickerProps {
  /** Current hex colour value (e.g. "#ff00cc") */
  value: string;
  /** Callback when the user picks a new colour */
  onChange: (hex: string) => void;
  /** Optional label displayed to the left (default: "Color") */
  label?: string;
  /** Minimum width for the label column (default: "50px") */
  labelWidth?: string;
  /** Whether to show the hex value text next to the swatch (default: true) */
  showHex?: boolean;
}

const PanelColorPickerComponent: React.FC<PanelColorPickerProps> = ({
  value,
  onChange,
  label = 'Color',
  labelWidth = '50px',
  showHex = true,
}) => {
  // Input type="color" only accepts 6-char hex; strip alpha if present
  const swatchValue = value.length > 7 ? value.substring(0, 7) : value;

  return (
    <HStack gap={1}>
      <Text fontSize="xs" minW={labelWidth} color="gray.600" _dark={{ color: 'gray.400' }} flexShrink={0}>
        {label}
      </Text>
      <Input
        type="color"
        value={swatchValue}
        onChange={(e) => onChange(e.target.value)}
        size="xs"
        w="32px"
        h="20px"
        p={0}
        border="none"
        cursor="pointer"
      />
      {showHex && (
        <Text fontSize="2xs" fontFamily="mono" color="gray.500">
          {value}
        </Text>
      )}
    </HStack>
  );
};

export const PanelColorPicker = React.memo(PanelColorPickerComponent);
PanelColorPicker.displayName = 'PanelColorPicker';
