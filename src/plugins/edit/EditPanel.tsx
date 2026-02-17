import React from 'react';
import { VStack, Box } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';

import { usePluginPanels } from '../../hooks/usePluginPanels';

interface EditPanelProps {
  activePlugin: string | null;
}

export const EditPanel: React.FC<EditPanelProps> = ({ activePlugin }) => {
  const contributedPanels = usePluginPanels('edit');

  if (activePlugin !== 'edit') return null;

  return (
    <Box position="relative">
      <RenderCountBadgeWrapper componentName="EditPanel" position="top-left" />
      <VStack spacing={0} align="stretch">
        {/* Dynamically render contributed panels */}
        {contributedPanels.map((panel) => (
          <React.Fragment key={panel.id}>
            <panel.component />
          </React.Fragment>
        ))}
      </VStack>
    </Box>
  );
};