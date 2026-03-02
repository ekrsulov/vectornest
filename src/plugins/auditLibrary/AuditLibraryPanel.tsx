import React, { Suspense } from 'react';
import { Box, VStack } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { usePluginPanels } from '../../hooks/usePluginPanels';

export const AuditLibraryPanel: React.FC = () => {
  const contributedPanels = usePluginPanels('auditLibrary');

  if (!contributedPanels.length) {
    return null;
  }

  return (
    <Box position="relative">
      <RenderCountBadgeWrapper componentName="AuditLibraryPanel" position="top-left" />
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
