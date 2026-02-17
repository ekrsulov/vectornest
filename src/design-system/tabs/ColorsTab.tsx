import React from 'react';
import { SimpleGrid, VStack, useColorModeValue } from '@chakra-ui/react';
import { SectionHeader } from '../../ui/SectionHeader';
import { useThemeColors } from '../../hooks';
import { ColorSwatch } from '../components/DesignSystemShared';

export const ColorsTab: React.FC = () => {
    const bg = useColorModeValue('gray.50', 'gray.900');
    const text = useColorModeValue('gray.800', 'gray.100');
    const border = useColorModeValue('gray.200', 'gray.700');
    const accent = useColorModeValue('blue.500', 'blue.300');
    const muted = useColorModeValue('gray.500', 'gray.400');

    const {
        panelButton,
        toolbar,
        ruler,
        activeTool,
    } = useThemeColors();

    const panel = { bg: panelButton.panelBg };
    const sidebar = { bg: useColorModeValue('white', 'gray.800') };
    const canvas = { bg: ruler.bg };
    const selection = { stroke: activeTool.bg };

    return (
        <VStack align="stretch" spacing={8}>
            <SectionHeader title="Theme Colors" />
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                <ColorSwatch color={bg} label="Background" subLabel="bg" />
                <ColorSwatch color={text} label="Text" subLabel="text" />
                <ColorSwatch color={border} label="Border" subLabel="border" />
                <ColorSwatch color={accent} label="Accent" subLabel="accent" />
                <ColorSwatch color={muted} label="Muted" subLabel="muted" />
                <ColorSwatch color={panel.bg} label="Panel Background" subLabel="panel.bg" />
                <ColorSwatch color={sidebar.bg} label="Sidebar Background" subLabel="sidebar.bg" />
                <ColorSwatch color={toolbar.bg} label="Toolbar Background" subLabel="toolbar.bg" />
                <ColorSwatch color={canvas.bg} label="Canvas Background" subLabel="canvas.bg" />
                <ColorSwatch color={selection.stroke} label="Selection Stroke" subLabel="selection.stroke" />
            </SimpleGrid>
        </VStack>
    );
};
