import React from 'react';
import {
    HStack,
    Text,
    Box,
    VStack
} from '@chakra-ui/react';
import { LinecapSelector } from '../../../ui/LinecapSelector';
import { LinejoinSelector } from '../../../ui/LinejoinSelector';
import { FillRuleSelector } from '../../../ui/FillRuleSelector';
import { DashArrayCustomInput, DashArrayPresets } from '../../../ui/DashArraySelector';

interface EditorStrokeControlsProps {
    labelColor: string;
    currentStrokeLinecap: 'butt' | 'round' | 'square';
    handleStrokeLinecapChange: (val: 'butt' | 'round' | 'square') => void;
    currentStrokeLinejoin: 'miter' | 'round' | 'bevel';
    handleStrokeLinejoinChange: (val: 'miter' | 'round' | 'bevel') => void;
    currentFillRule: 'nonzero' | 'evenodd';
    handleFillRuleChange: (val: 'nonzero' | 'evenodd') => void;
    currentStrokeDasharray: string;
    handleStrokeDasharrayChange: (val: string) => void;
}

const EditorStrokeControlsComponent: React.FC<EditorStrokeControlsProps> = ({
    labelColor,
    currentStrokeLinecap,
    handleStrokeLinecapChange,
    currentStrokeLinejoin,
    handleStrokeLinejoinChange,
    currentFillRule,
    handleFillRuleChange,
    currentStrokeDasharray,
    handleStrokeDasharrayChange
}) => {
    return (
        <VStack spacing={0} align="stretch">
            {/* Linecap */}
            <HStack justify="flex-start" minH="24px" spacing={1} width="100%">
                <Text
                    fontSize="12px"
                    fontWeight="400"
                    color={labelColor}
                    w="50px"
                    flexShrink={0}
                    h="24px"
                    display="flex"
                    alignItems="center"
                    title="Stroke Linecap"
                >
                    LineCap
                </Text>
                <Box flex="1 1 0">
                    <LinecapSelector
                        value={currentStrokeLinecap || 'round'}
                        onChange={handleStrokeLinecapChange}
                        title="Stroke Linecap"
                        size="sm"
                        fullWidth
                    />
                </Box>
            </HStack>

            {/* Linejoin */}
            <HStack justify="flex-start" minH="24px" spacing={1} width="100%">
                <Text
                    fontSize="12px"
                    fontWeight="400"
                    color={labelColor}
                    w="50px"
                    flexShrink={0}
                    h="24px"
                    display="flex"
                    alignItems="center"
                    title="Stroke Linejoin"
                >
                    LineJoin
                </Text>
                <Box flex="1 1 0">
                    <LinejoinSelector
                        value={currentStrokeLinejoin || 'round'}
                        onChange={handleStrokeLinejoinChange}
                        title="Stroke Linejoin"
                        size="sm"
                        fullWidth
                    />
                </Box>
            </HStack>

            {/* Fill Rule */}
            <HStack justify="flex-start" minH="24px" spacing={1} width="100%">
                <Text
                    fontSize="12px"
                    fontWeight="400"
                    color={labelColor}
                    w="50px"
                    flexShrink={0}
                    h="24px"
                    display="flex"
                    alignItems="center"
                    title="Fill Rule"
                >
                    FillRule
                </Text>
                <Box flex="1 1 0">
                    <FillRuleSelector
                        value={currentFillRule || 'nonzero'}
                        onChange={handleFillRuleChange}
                        title="Fill Rule"
                        size="sm"
                        fullWidth
                    />
                </Box>
            </HStack>

            {/* Custom Dash Array */}
            <HStack justify="flex-start" minH="24px" spacing={1}>
                <Text
                    fontSize="12px"
                    fontWeight="400"
                    color={labelColor}
                    w="50px"
                    flexShrink={0}
                    h="24px"
                    display="flex"
                    alignItems="center"
                    title="Custom Dash Array"
                >
                    Dash
                </Text>
                <Box flex={1}>
                    <DashArrayCustomInput
                        value={currentStrokeDasharray || 'none'}
                        onChange={handleStrokeDasharrayChange}
                        title="Custom dash array (e.g., 5,3,2,3)"
                    />
                </Box>
                <DashArrayPresets
                    value={currentStrokeDasharray || 'none'}
                    onChange={handleStrokeDasharrayChange}
                />
            </HStack>
        </VStack>
    );
};

export const EditorStrokeControls = React.memo(EditorStrokeControlsComponent);
EditorStrokeControls.displayName = 'EditorStrokeControls';
