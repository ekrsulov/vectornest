import React, { useMemo, useState } from 'react';
import { Box, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react';
import { SectionHeader } from '../../ui/SectionHeader';
import { MultiPaintPicker } from '../../ui/MultiPaintPicker';
import { RichTextEditor } from '../../ui/RichTextEditor';
import { PresetButton } from '../../ui/FillAndStrokePresetButton';
import { DashArrayPresets } from '../../ui/DashArraySelector';
import type { Preset } from '../../utils/fillAndStrokePresets';

export const EditorTab: React.FC = () => {
    const [fill, setFill] = useState('#4fd1c5');
    const [stroke, setStroke] = useState('#0ea5e9');
    const [richText, setRichText] = useState('<p>Rich text editor content</p>');

    const presets = useMemo<Preset[]>(() => [
        { id: '1', name: 'Preset 1', strokeWidth: 2, strokeColor: '#0ea5e9', strokeOpacity: 1, fillColor: '#99f6e4', fillOpacity: 0.8 },
        { id: '2', name: 'Preset 2', strokeWidth: 3, strokeColor: '#6d28d9', strokeOpacity: 0.9, fillColor: '#ede9fe', fillOpacity: 0.7 },
        { id: '3', name: 'Preset 3', strokeWidth: 4, strokeColor: '#fb923c', strokeOpacity: 1, fillColor: '#fef3c7', fillOpacity: 0.75 },
    ], []);

    return (
        <VStack align="stretch" spacing={8}>
            <SectionHeader title="Paint Pickers" />
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={8}>
                <MultiPaintPicker
                    label="Fill"
                    value={fill}
                    onChange={setFill}
                    defaultColor="#99f6e4"
                    mode="fill"
                />
                <MultiPaintPicker
                    label="Stroke"
                    value={stroke}
                    onChange={setStroke}
                    defaultColor="#0ea5e9"
                    mode="stroke"
                />
            </SimpleGrid>

            <SectionHeader title="Rich Text Editor" />
            <Box h="300px">
                <RichTextEditor
                    value={richText}
                    onChange={(val) => setRichText(val.html)}
                />
            </Box>

            <SectionHeader title="Presets & Dash Array" />
            <VStack align="stretch" spacing={4}>
                <Text fontSize="sm">Presets</Text>
                <HStack spacing={2}>
                    {presets.map(p => (
                        <PresetButton key={p.id} preset={p} onClick={() => { }} />
                    ))}
                </HStack>

                <Text fontSize="sm" mt={2}>Dash Array</Text>
                <DashArrayPresets
                    value="0"
                    onChange={() => { }}
                />
            </VStack>
        </VStack>
    );
};
