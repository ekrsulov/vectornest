import React from 'react';
import type { ReactNode } from 'react';
import { Input, InputGroup, InputLeftElement, InputRightElement } from '@chakra-ui/react';

interface PanelTextInputProps {
  value: string;
  onChange: (val: string) => void;
  type?: React.InputHTMLAttributes<HTMLInputElement>['type'];
  placeholder?: string;
  width?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  textAlign?: 'left' | 'center' | 'right';
  height?: string;
}

export const PanelTextInput: React.FC<PanelTextInputProps> = ({
  value,
  onChange,
  type = 'text',
  placeholder,
  width = '80px',
  leftIcon,
  rightElement,
  textAlign = 'left',
  height = '20px',
}) => {
  const input = (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      size="sm"
      h={height}
      w={width && !leftIcon && !rightElement ? width : 'full'} // If grouped, width applies to group
      pl={leftIcon ? '28px' : 2}
      pr={rightElement ? '28px' : 2}
      textAlign={textAlign}
      borderRadius="0"
      m={0.5}
      borderColor="gray.300"
      bg="white"
      _dark={{
        borderColor: 'whiteAlpha.300',
        bg: 'gray.800',
        _focus: {
          borderColor: 'whiteAlpha.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-whiteAlpha-500)'
        }
      }}
      _focus={{
        borderColor: 'gray.600',
        boxShadow: '0 0 0 1px var(--chakra-colors-gray-600)'
      }}
    />
  );

  if (leftIcon || rightElement) {
    return (
      <InputGroup size="sm" h={height} w={width} m={0.5}>
        {leftIcon && (
          <InputLeftElement pointerEvents="none" h={height} w="28px" children={leftIcon} />
        )}
        {input}
        {rightElement && (
          // pointerEvents="auto" needed for interactive right element like a button
          <InputRightElement h={height} w="28px" children={rightElement} />
        )}
      </InputGroup>
    );
  }

  return input;
};
