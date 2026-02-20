import React from 'react';
import { VStack, Box } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { usePluginPanels } from '../../hooks/usePluginPanels';

interface LibraryRelatedPanelsProps {
  targetPluginId?: string;
  badgeComponentName?: string;
}

export const LibraryRelatedPanels: React.FC<LibraryRelatedPanelsProps> = ({
  targetPluginId = 'library',
  badgeComponentName = 'LibraryPanelRelated',
}) => {
  // Get panels contributed to the target panel container plugin
  const contributedPanels = usePluginPanels(targetPluginId);

  if (!contributedPanels.length) return null;

  return (
    <Box position="relative">
      <RenderCountBadgeWrapper componentName={badgeComponentName} position="top-left" />
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
