import React from 'react';
import { Button, type ButtonProps } from '@chakra-ui/react';

/**
 * Standardized button for panel actions (operations, alignment, etc.)
 * Provides consistent styling across all panel components
 * 
 * This component replaces the deprecated OperationButton and AlignmentActionButton,
 * which have been removed from the codebase.
 */
export const PanelStyledButton: React.FC<ButtonProps> = (props) => {
  const { size = 'sm', ...restProps } = props;
  
  return (
    <Button
      variant="unstyled"
      size={size}
      bg="transparent"
      color="gray.700"
      border="1px solid"
      borderColor="gray.400"
      borderRadius="full"
      fontWeight="medium"
      fontSize="10px"
      transition="all 0.2s"
      _hover={{
        bg: 'gray.50'
      }}
      _dark={{
        color: 'gray.300',
        borderColor: 'whiteAlpha.400',
        _hover: {
          bg: 'whiteAlpha.100'
        }
      }}
      sx={{
        h: size === 'xs' ? '20px' : '20px',
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      {...restProps}
    />
  );
};
