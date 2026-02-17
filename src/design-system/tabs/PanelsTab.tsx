import React from 'react';
import { Box, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { Panel } from '../../ui/Panel';
import { PanelTextInput } from '../../ui/PanelTextInput';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { SliderControl } from '../../ui/SliderControl';
import { LibraryItemCard } from '../../ui/LibraryItemCard';
import { SectionHeader } from '../../ui/SectionHeader';

export const PanelsTab: React.FC = () => {

    return (
        <VStack align="stretch" spacing={8}>
            <SectionHeader title="Standard Panel" />
            <Box maxW="sm">
                <Panel title="Example Panel" defaultOpen>
                    <VStack align="stretch" spacing={2}>
                        <Text fontSize="sm">This is standard panel content.</Text>
                        <PanelTextInput placeholder="Input inside panel" value="" onChange={() => { }} />
                        <PanelStyledButton size="sm">Panel Button</PanelStyledButton>
                    </VStack>
                </Panel>
            </Box>

            <SectionHeader title="Collapsible & Maximizable" />
            <Box maxW="sm">
                <Panel title="Advanced Panel" defaultOpen isCollapsible isMaximizable>
                    <VStack align="stretch" spacing={2}>
                        <Text fontSize="sm">Try maximizing this panel using the icon in the header.</Text>
                        <SliderControl label="Opacity" value={80} min={0} max={100} onChange={() => { }} />
                    </VStack>
                </Panel>
            </Box>

            <SectionHeader title="Library Item Card" />
            <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
                <LibraryItemCard name="Item 1" details="Details" preview={<Box w="full" h="full" bg="blue.200" />} />
                <LibraryItemCard name="Item 2" details="Details" isSelected preview={<Box w="full" h="full" bg="blue.500" />} />
            </SimpleGrid>
        </VStack>
    );
};
