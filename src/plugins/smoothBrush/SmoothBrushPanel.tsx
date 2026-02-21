import React from 'react';
import { HStack, VStack, Box } from '@chakra-ui/react';
import { SliderControl } from '../../ui/SliderControl';
import { PercentSliderControl } from '../../ui/PercentSliderControl';
import { PanelToggle } from '../../ui/PanelToggle';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';
import { useCanvasStore } from '../../store/canvasStore';
import type { SmoothBrushPluginSlice } from './slice';
import { Panel } from '../../ui/Panel';


export const SmoothBrushPanel: React.FC = () => {
    const smoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).smoothBrush);
    const selectedCommands = useCanvasStore((state) => (state as any).selectedCommands || []); // eslint-disable-line @typescript-eslint/no-explicit-any
    const updateSmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).updateSmoothBrush);
    const applySmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).applySmoothBrush);
    const activateSmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).activateSmoothBrush);
    const deactivateSmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).deactivateSmoothBrush);
    const resetSmoothBrush = useCanvasStore((state) => (state as unknown as SmoothBrushPluginSlice).resetSmoothBrush);

    return (
        <Panel
            title="Smooth Brush"
            isCollapsible={true}
            defaultOpen={false}
            headerActions={
                <HStack spacing={1}>
                    <PanelSwitch
                        isChecked={smoothBrush.isActive}
                        onChange={(e) => {
                            if (e.target.checked) {
                                activateSmoothBrush();
                            } else {
                                deactivateSmoothBrush();
                            }
                        }}
                    />
                    {!smoothBrush.isActive && (
                        <PanelStyledButton
                            onClick={(e) => {
                                e.stopPropagation();
                                applySmoothBrush();
                            }}
                            size="xs"
                            title={
                                smoothBrush.isActive && selectedCommands.length > 0
                                    ? `Apply Smooth to ${selectedCommands.length} Selected Point${selectedCommands.length === 1 ? '' : 's'}`
                                    : 'Apply Smooth Brush'
                            }
                        >
                            Apply
                        </PanelStyledButton>
                    )}
                </HStack>
            }
        >
            <RenderCountBadgeWrapper componentName="SmoothBrushPanel" position="top-left" />
            <VStack spacing={1} align="stretch" pb={0.5}>
                <HStack justify="space-between" align="center">
                    <PanelToggle
                        isChecked={smoothBrush.simplifyPoints}
                        onChange={(e) => updateSmoothBrush?.({ simplifyPoints: e.target.checked })}
                    >
                        Simplify Points
                    </PanelToggle>
                    <PanelStyledButton onClick={resetSmoothBrush} size="xs" title="Reset all smooth brush settings to defaults" mb="2px">
                        Reset
                    </PanelStyledButton>
                </HStack>

                <Box pr={0.5}>
                    <PercentSliderControl
                            label="Strength"
                            value={smoothBrush.strength}
                            step={0.01}
                            onChange={(value) => updateSmoothBrush?.({ strength: value })}
                            labelWidth="60px"
                            valueWidth="40px"
                            marginBottom={smoothBrush.isActive || smoothBrush.simplifyPoints ? '2px' : '0'}
                        />
                </Box>

                    {smoothBrush.isActive && (
                        <Box pr={0.5}>
                            <SliderControl
                                label="Radius"
                                value={smoothBrush.radius}
                                min={6}
                                max={60}
                                step={1}
                                onChange={(value) => updateSmoothBrush?.({ radius: value })}
                                labelWidth="60px"
                                valueWidth="40px"
                                marginBottom="2px"
                            />
                        </Box>
                    )}

                    {smoothBrush.simplifyPoints && (
                        <Box pr={0.5}>
                            <SliderControl
                                label="Tolerance"
                                value={smoothBrush.simplificationTolerance}
                                min={0.1}
                                max={10}
                                step={0.1}
                                onChange={(value) => updateSmoothBrush?.({ simplificationTolerance: value })}
                                formatter={(value) => value.toFixed(1)}
                                labelWidth="60px"
                                valueWidth="40px"
                                marginBottom="2px"
                            />
                        </Box>
                    )}

                    {smoothBrush.simplifyPoints && (
                        <Box pr={0.5}>
                            <SliderControl
                                label="Min Dist"
                                value={smoothBrush.minDistance}
                                min={0.1}
                                max={5.0}
                                step={0.1}
                                onChange={(value) => updateSmoothBrush?.({ minDistance: value })}
                                formatter={(value) => value.toFixed(1)}
                                labelWidth="60px"
                                valueWidth="40px"
                                marginBottom="0"
                            />
                        </Box>
                    )}
            </VStack>
        </Panel>
    );
};
