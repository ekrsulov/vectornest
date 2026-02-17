import React from 'react';
import { VStack, Box } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { usePluginPanels } from '../../hooks/usePluginPanels';

export const LibraryRelatedPanels: React.FC = () => {
  // Get panels contributed to the library panel
  const contributedPanels = usePluginPanels('library');

  if (!contributedPanels.length) return null;

  return (
    <Box position="relative">
      <RenderCountBadgeWrapper componentName="LibraryPanelRelated" position="top-left" />
      <VStack spacing={0} align="stretch">
        {contributedPanels.map((panel) => (
          <React.Fragment key={panel.id}>
            <panel.component />
          </React.Fragment>
        ))}
      </VStack>
    </Box>
  );
};
