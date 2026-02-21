import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ErodeDilatePluginSlice } from './slice';

export const ErodeDilatePanel: React.FC = () => {
    const erodeDilate = useCanvasStore(
        (state) => (state as CanvasStore & ErodeDilatePluginSlice).erodeDilate
    );
    const updateErodeDilateState = useCanvasStore(
        (state) => (state as CanvasStore & ErodeDilatePluginSlice).updateErodeDilateState
    );

    return (
        <Panel title="Erode / Dilate" isCollapsible defaultOpen={true}>
            <SectionHeader title="Mode" />
            <CustomSelect
                value={erodeDilate?.mode ?? 'dilate'}
                onChange={(val) =>
                    updateErodeDilateState?.({ mode: val as 'erode' | 'dilate' })
                }
                options={[
                    { label: 'Dilate (Expand)', value: 'dilate' },
                    { label: 'Erode (Shrink)', value: 'erode' },
                ]}
            />
            <SliderControl
                label="Brush Radius"
                value={erodeDilate?.brushRadius ?? 30}
                min={5}
                max={80}
                step={1}
                onChange={(val) => updateErodeDilateState?.({ brushRadius: val })}
            />
            <SliderControl
                label="Amount"
                value={erodeDilate?.amount ?? 3}
                min={0.5}
                max={15}
                step={0.5}
                onChange={(val) => updateErodeDilateState?.({ amount: val })}
            />
        </Panel>
    );
};
