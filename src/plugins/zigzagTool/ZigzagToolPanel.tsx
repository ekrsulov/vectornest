import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ZigzagToolPluginSlice } from './slice';

export const ZigzagToolPanel: React.FC = () => {
    const zigzagTool = useCanvasStore(
        (state) => (state as CanvasStore & ZigzagToolPluginSlice).zigzagTool
    );
    const updateZigzagToolState = useCanvasStore(
        (state) => (state as CanvasStore & ZigzagToolPluginSlice).updateZigzagToolState
    );

    return (
        <Panel title="Zigzag Tool" isCollapsible defaultOpen={true}>
            <SectionHeader title="Wave Style" />
            <CustomSelect
                value={zigzagTool?.style ?? 'zigzag'}
                onChange={(val) =>
                    updateZigzagToolState?.({ style: val as 'zigzag' | 'sine' | 'square' })
                }
                options={[
                    { label: 'Zigzag', value: 'zigzag' },
                    { label: 'Sine Wave', value: 'sine' },
                    { label: 'Square Wave', value: 'square' },
                ]}
            />
            <SliderControl
                label="Amplitude"
                value={zigzagTool?.amplitude ?? 10}
                min={2}
                max={50}
                step={1}
                onChange={(val) => updateZigzagToolState?.({ amplitude: val })}
            />
            <SliderControl
                label="Frequency"
                value={zigzagTool?.frequency ?? 8}
                min={2}
                max={40}
                step={1}
                onChange={(val) => updateZigzagToolState?.({ frequency: val })}
            />
        </Panel>
    );
};
