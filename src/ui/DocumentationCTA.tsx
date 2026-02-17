import React from 'react';
import { VStack, Image, Text } from '@chakra-ui/react';

/**
 * Call to Action component for app branding
 * Displays the logo and application name
 */
export const DocumentationCTA: React.FC = () => {
  return (
    <VStack spacing={0} align="center">
      <Image src="./logo-animated.svg" boxSize="75px"  />
      <Text fontFamily="Momo Trust Display" fontSize="lg" textAlign="center">VectorNest</Text>
    </VStack>
  );
};
