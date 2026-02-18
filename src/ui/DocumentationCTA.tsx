import React from 'react';
import { VStack, Image, Text, Link } from '@chakra-ui/react';
import { Github } from 'lucide-react';
import { PanelStyledButton } from './PanelStyledButton';

/**
 * Call to Action component for app branding
 * Displays the logo and application name
 */
export const DocumentationCTA: React.FC = () => {
  return (
    <VStack spacing={2} align="center">
      <Image src="./logo-animated.svg" boxSize="75px"  />
      <Text fontFamily="Momo Trust Display" fontSize="lg" textAlign="center">VectorNest</Text>
      <Link href="https://github.com/ekrsulov/vectornest" isExternal>
        <PanelStyledButton leftIcon={<Github size={12} />} gap={1}>
          GitHub
        </PanelStyledButton>
      </Link>
    </VStack>
  );
};
