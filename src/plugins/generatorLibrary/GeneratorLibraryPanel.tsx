import React, { Suspense } from 'react';
import { Box, VStack } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { usePluginPanels } from '../../hooks/usePluginPanels';

export const GeneratorLibraryPanel: React.FC = () => {
  const contributedPanels = usePluginPanels('generatorLibrary');

  if (!contributedPanels.length) {
    return null;
  }

  return (
    <Box position="relative">
      <RenderCountBadgeWrapper componentName="GeneratorLibraryPanel" position="top-left" />
      <VStack spacing={0} align="stretch">
        {contributedPanels.map((panel) => (
          <Suspense key={panel.id} fallback={<Box py={4} />}>
            <panel.component />
          </Suspense>
        ))}
      </VStack>
    </Box>
  );
};
