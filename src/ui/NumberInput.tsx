import React, { useState, useEffect, useRef } from 'react';
import {
  HStack,
  Input,
  Text,
  Box
} from '@chakra-ui/react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  icon?: React.ReactNode;
  labelWidth?: string;
  inputWidth?: string;
  resetAfterChange?: boolean; // New prop to reset value after onChange is called
  testId?: string;
  isDisabled?: boolean;
}

const NumberInputComponent: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  icon,
  labelWidth = '40px',
  inputWidth = '60px',
  resetAfterChange = false
  , testId,
  isDisabled = false
}) => {
  const inputValueRef = useRef<string>(value.toString());
  const [inputValue, setInputValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const newValueStr = value.toString();
    if (newValueStr !== inputValueRef.current) {
      // Clear previous timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Set new timeout to update after 100ms
      debounceTimeoutRef.current = setTimeout(() => {
        setInputValue(newValueStr);
        inputValueRef.current = newValueStr;
        debounceTimeoutRef.current = null;
      }, 100);
    }
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    inputValueRef.current = newValue;
    // Clear debounce timeout since user is typing
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Select all text on focus for easy editing
    // Using queueMicrotask for cleaner async scheduling than setTimeout(fn, 0)
    queueMicrotask(() => inputRef.current?.select());
  };

  const handleBlur = () => {
    setIsFocused(false);
    let numValue = parseFloat(inputValue);
    
    if (isNaN(numValue)) {
      numValue = value;
    } else {
      if (min !== undefined && numValue < min) {
        numValue = min;
      }
      if (max !== undefined && numValue > max) {
        numValue = max;
      }
    }
    
    if (resetAfterChange) {
      // For reset mode, call onChange with the value, then reset to 0
      if (numValue !== 0 && numValue !== value) {
        onChange(numValue);
        setInputValue('0');
        inputValueRef.current = '0';
      }
    } else {
      // Normal mode: sync state and call onChange
      setInputValue(numValue.toString());
      inputValueRef.current = numValue.toString();
      if (numValue !== value) {
        onChange(numValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = Math.min(max ?? Infinity, value + step);
      if (newValue !== value) {
        onChange(newValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = Math.max(min ?? -Infinity, value - step);
      if (newValue !== value) {
        onChange(newValue);
      }
    }
  };

  // Display value with suffix when not focused
  const displayValue = isFocused ? inputValue : (suffix ? `${inputValue}${suffix}` : inputValue);

  return (
    <HStack spacing={2} w="100%">
      {icon && (
        <Box color="gray.600" _dark={{ color: 'gray.400' }} flexShrink={0}>
          {icon}
        </Box>
      )}
      {label && (
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
      <Input
        ref={inputRef}
        data-testid={testId}
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        type="text"
        isDisabled={isDisabled}
        textAlign="right"
        fontSize="12px"
        h="20px"
        w={inputWidth}
        px={2}
        borderRadius="0"
        borderColor="gray.300"
        bg="white"
        _dark={{
          borderColor: 'whiteAlpha.300',
          bg: 'gray.800'
        }}
        _focus={{
          borderColor: 'gray.600',
          boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
        }}
      />
    </HStack>
  );
};

export const NumberInput = React.memo(NumberInputComponent);
NumberInput.displayName = 'NumberInput';
