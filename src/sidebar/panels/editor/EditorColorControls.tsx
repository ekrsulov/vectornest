import React, { useRef } from 'react';
import {
    VStack,
    Flex,
    Text,
    Box
} from '@chakra-ui/react';
import { X } from 'lucide-react';
import { PercentSliderControl } from '../../../ui/PercentSliderControl';
import { ToggleButton } from '../../../ui/ToggleButton';
import ConditionalTooltip from '../../../ui/ConditionalTooltip';
import { MultiPaintPicker } from '../../../ui/MultiPaintPicker';

interface EditorColorControlsProps {
    labelColor: string;
    defaultStrokeColor: string;

    currentFillOpacity: number;
    handleFillOpacityChange: (val: number) => void;
    currentFillColor: string;
    handleFillNone: () => void;
    handleFillColorChange: (val: string) => void;

    currentStrokeOpacity: number;
    handleOpacityChange: (val: number) => void;
    currentStrokeColor: string;
    handleStrokeNone: () => void;
    handleStrokeColorChange: (val: string) => void;
}

const EditorColorControlsComponent: React.FC<EditorColorControlsProps> = ({
    labelColor,
    defaultStrokeColor,
    currentFillOpacity,
    handleFillOpacityChange,
    currentFillColor,
    handleFillNone,
    handleFillColorChange,
    currentStrokeOpacity,
    handleOpacityChange,
    currentStrokeColor,
    handleStrokeNone,
    handleStrokeColorChange
}) => {
    const fillPickerSlotRef = useRef<HTMLDivElement>(null);
    const strokePickerSlotRef = useRef<HTMLDivElement>(null);

    return (
        <VStack spacing={0} align="stretch">
            {/* Fill Color & Opacity */}
            <VStack spacing={0} align="stretch">
                <Flex align="center" gap={1} minH="24px" w="100%" flexWrap="nowrap">
                    <Text fontSize="12px" fontWeight="400" color={labelColor} minW="50px" flexShrink={0} h="24px" display="flex" alignItems="center">
                        Fill
                    </Text>
                    <Box flex="1 1 0" minW="0">
                        <PercentSliderControl
                            value={currentFillOpacity}
                            onChange={handleFillOpacityChange}
                            title="Fill Opacity"
                            minWidth="50px"
                            valueWidth="40px"
                            inline={true}
                            gap="4px"
                        />
                    </Box>
                    <ToggleButton
                        isActive={currentFillColor === 'none'}
                        onClick={handleFillNone}
                        aria-label="Set fill color to none (transparent)"
                        variant="icon"
                        icon={<X size={12} />}
                        sx={{ borderRadius: 'full' }}
                        isDisabled={currentStrokeColor === 'none'}
                    />
                    <Box flex="0 0 auto" minW="24px" display="flex" justifyContent="flex-end">
                        <ConditionalTooltip label="Select fill color">
                            <MultiPaintPicker
                                label="Fill"
                                value={currentFillColor === 'none' ? defaultStrokeColor : currentFillColor}
                                onChange={(val) => handleFillColorChange(val)}
                                defaultColor={defaultStrokeColor}
                                mode="fill"
                                floatingContainerRef={fillPickerSlotRef}
                                fullWidth={true}
                            />
                        </ConditionalTooltip>
                    </Box>
                </Flex>
                <Box ref={fillPickerSlotRef} w="100%" />
            </VStack>

            {/* Stroke Color & Opacity */}
            <VStack spacing={0} align="stretch">
                <Flex align="center" gap={1} minH="24px" w="100%" flexWrap="nowrap">
                    <Text fontSize="12px" fontWeight="400" color={labelColor} minW="50px" flexShrink={0} h="24px" display="flex" alignItems="center">
                        Stroke
                    </Text>
                    <Box flex="1 1 0" minW="0">
                        <PercentSliderControl
                            value={currentStrokeOpacity}
                            onChange={handleOpacityChange}
                            title="Stroke Opacity"
                            minWidth="50px"
                            valueWidth="40px"
                            inline={true}
                            gap="4px"
                        />
                    </Box>
                    <ToggleButton
                        isActive={currentStrokeColor === 'none'}
                        onClick={handleStrokeNone}
                        aria-label="Set stroke color to none (no outline)"
                        variant="icon"
                        icon={<X size={12} />}
                        sx={{ borderRadius: 'full' }}
                        isDisabled={currentFillColor === 'none'}
                    />
                    <Box flex="0 0 auto" minW="24px" display="flex" justifyContent="flex-end">
                        <ConditionalTooltip label="Select stroke color">
                            <MultiPaintPicker
                                label="Stroke"
                                value={currentStrokeColor === 'none' ? defaultStrokeColor : currentStrokeColor}
                                onChange={(val) => handleStrokeColorChange(val)}
                                defaultColor={defaultStrokeColor}
                                mode="stroke"
                                floatingContainerRef={strokePickerSlotRef}
                                fullWidth={true}
                            />
                        </ConditionalTooltip>
                    </Box>
                </Flex>
                <Box ref={strokePickerSlotRef} w="100%" />
            </VStack>
        </VStack>
    );
};

export const EditorColorControls = React.memo(EditorColorControlsComponent);
EditorColorControls.displayName = 'EditorColorControls';
