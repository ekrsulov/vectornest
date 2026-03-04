import React, { Suspense } from 'react';
import { VStack, Box } from '@chakra-ui/react';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { usePluginPanels } from '../../hooks/usePluginPanels';
import { AutoPanelKeyProvider } from '../../contexts/AutoPanelKeyProvider';

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
  const autoPanelKeyNamespace = targetPluginId === 'generatorLibrary'
    ? 'sidebar:generatorLibrary'
    : targetPluginId === 'auditLibrary'
      ? 'sidebar:auditLibrary'
      : null;

  if (!contributedPanels.length) return null;

  return (
    <AutoPanelKeyProvider namespace={autoPanelKeyNamespace}>
      <Box position="relative">
        <RenderCountBadgeWrapper componentName={badgeComponentName} position="top-left" />
        <VStack spacing={0} align="stretch">
          {contributedPanels.map((panel) => (
            <Suspense key={panel.id} fallback={<Box py={4} />}>
              <panel.component />
            </Suspense>
          ))}
        </VStack>
      </Box>
    </AutoPanelKeyProvider>
  );
};
