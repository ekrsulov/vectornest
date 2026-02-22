import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ErodeDilatePluginSlice } from './slice';

export const ErodeDilatePanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const erodeDilate = useCanvasStore(
        (state) => (state as CanvasStore & ErodeDilatePluginSlice).erodeDilate
    );
    const updateErodeDilateState = useCanvasStore(
        (state) => (state as CanvasStore & ErodeDilatePluginSlice).updateErodeDilateState
    );

    return (
        <Panel title="Erode / Dilate" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
            <SectionHeader title="Mode" />
            <JoinedButtonGroup
                options={[
                    { label: 'Dilate', value: 'dilate', description: 'Expand paths outward' },
                    { label: 'Erode', value: 'erode', description: 'Shrink paths inward' },
                ]}
                value={erodeDilate?.mode ?? 'dilate'}
                onChange={(val) =>
                    updateErodeDilateState?.({ mode: val as 'erode' | 'dilate' })
                }
                size="sm"
                fullWidth
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
