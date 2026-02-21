import React, { useState, useEffect } from 'react';
import {
  Box,
  HStack,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Text,
  VStack,
} from '@chakra-ui/react';
import { clamp } from '../utils/coreHelpers';

const EDIT_INPUT_STYLE: React.CSSProperties = {
  fontSize: '11px',
  color: 'inherit',
  width: '100%',
  textAlign: 'right',
  border: 'none',
  outline: 'none',
  background: 'transparent',
};

interface SliderControlProps {
  icon?: React.ReactNode;
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  stepFunction?: (value: number) => number; // Dynamic step function
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
  title?: string;
  minWidth?: string;
  labelWidth?: string;
  valueWidth?: string;
  marginBottom?: string;
  inline?: boolean; // New prop for inline usage
  gap?: string; // Custom gap for inline usage
  allowOutOfRangeInput?: boolean;
  stacked?: boolean; // Label above slider row
}

const SliderControlComponent: React.FC<SliderControlProps> = ({
  icon,
  label,
  value,
  min,
  max,
  step = 1,
  stepFunction,
  onChange,
  formatter,
  title,
  minWidth = '60px',
  labelWidth = '40px',
  valueWidth = '50px',
  marginBottom = '0',
  inline = false,
  gap = '8px',
  allowOutOfRangeInput = false,
  stacked = false
}) => {
  const safeValue = Number.isFinite(value) ? value : (Number.isFinite(min) ? min : 0);
  const currentStep = stepFunction ? stepFunction(safeValue) : step;
  const formattedValue = formatter ? formatter(safeValue) : (currentStep < 1 ? safeValue.toFixed(2) : safeValue.toString());
  const isPercent = formattedValue.includes('%');

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(isPercent ? (safeValue * 100).toString() : safeValue.toString());

  // Update editValue when value changes
  useEffect(() => {
    setEditValue(isPercent ? (safeValue * 100).toString() : safeValue.toString());
  }, [safeValue, isPercent]);

  const handleChange = (newValue: number) => {
    // If stepFunction is provided, quantize the value to the appropriate step
    if (stepFunction) {
      const dynamicStep = stepFunction(newValue);
      const quantizedValue = Math.round(newValue / dynamicStep) * dynamicStep;
      // For slider drag updates, keep behavior unchanged and clamp to min/max
      onChange(Math.max(min, Math.min(max, quantizedValue)));
    } else {
      onChange(newValue);
    }
  };

  const handleEditConfirm = () => {
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed)) {
      const actualValue = isPercent ? parsed / 100 : parsed;
      // Keep typed values exact (no step quantization on text input).
      // Slider drag still uses stepFunction via handleChange.
      const valueToSet = actualValue;

      // Typed values can optionally bypass the slider min/max bounds.
      // The slider thumb still renders at a clamped position so layout remains stable.
      if (allowOutOfRangeInput) {
        onChange(valueToSet);
      } else if (isPercent) {
        // Percent sliders remain bounded by default.
        handleChange(Math.max(min, Math.min(max, valueToSet)));
      } else {
        // Non-percent sliders allow typing above max, but keep min bounded unless explicitly overridden.
        onChange(Math.max(min, valueToSet));
      }
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditValue(isPercent ? (value * 100).toString() : value.toString());
    setIsEditing(false);
  };

  // When the actual value is outside the slider min/max, show the slider thumb at the clamped value
  const sliderValue = clamp(safeValue, min, max);

  const sliderRow = (
    <HStack
      spacing={gap}
      mb={inline ? 0 : stacked ? 0 : marginBottom}
      w={inline || stacked ? '100%' : undefined}
    >
      {icon && !stacked && (
        <Box color="gray.600" _dark={{ color: 'gray.400' }} flexShrink={0}>
          {icon}
        </Box>
      )}
      {label && !stacked && (
        <Text
          fontSize="12px"
          color="gray.600"
          _dark={{ color: 'gray.400' }}
          minW={labelWidth}
          flexShrink={0}
        >
          {label}
        </Text>
      )}
      <Slider
        flex={1}
        min={min}
        max={max}
        step={stepFunction ? 0.01 : step} // Use very small step when stepFunction is provided
        value={sliderValue}
        onChange={handleChange}
        minW={minWidth}
        title={title}
      >
        <SliderTrack h="4px" borderRadius="2px" bg="gray.300" _dark={{ bg: 'gray.600' }}>
          <SliderFilledTrack bg="gray.600" _dark={{ bg: 'gray.400' }} />
        </SliderTrack>
        <SliderThumb boxSize="12px" />
      </Slider>
      <VStack spacing="2px" alignItems="flex-end" w={valueWidth} flexShrink={0} ml={gap}>
        <Box
          minH="20px"
          w="100%"
          m={0.5}
          borderWidth="1px"
          borderColor={isEditing ? 'gray.600' : 'gray.300'}
          bg="white"
          _dark={{
            borderColor: isEditing ? 'whiteAlpha.500' : 'whiteAlpha.300',
            bg: 'gray.800',
            _focusWithin: { borderColor: 'whiteAlpha.500', boxShadow: '0 0 0 1px var(--chakra-colors-whiteAlpha-500)' }
          }}
          _focusWithin={{ borderColor: 'gray.600', boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)' }}
          opacity={isEditing ? 1 : 0.95}
          onClick={isEditing ? undefined : () => setIsEditing(true)}
          px="2px"
          py="0px"
          borderRadius="0"
        >
          {isEditing ? (
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditConfirm}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditConfirm();
                } else if (e.key === 'Escape') {
                  handleEditCancel();
                }
              }}
              style={EDIT_INPUT_STYLE}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          ) : (
            <Text
              fontSize="11px"
              color="gray.600"
              _dark={{ color: 'gray.400' }}
              textAlign="right"
              w="100%"
            >
              {formattedValue}
            </Text>
          )}
        </Box>
      </VStack>
    </HStack>
  );

  if (stacked) {
    return (
      <VStack align="stretch" gap={0} mb={marginBottom} px={0}>
        {label && (
          <Text
            fontSize="12px"
            color="gray.600"
            _dark={{ color: 'gray.400' }}
            px={2}
            pt={1}
          >
            {label}
          </Text>
        )}
        {sliderRow}
      </VStack>
    );
  }

  return sliderRow;
};

export const SliderControl = React.memo(SliderControlComponent);
SliderControl.displayName = 'SliderControl';
