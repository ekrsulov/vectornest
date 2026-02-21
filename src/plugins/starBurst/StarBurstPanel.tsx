import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { StarBurstPluginSlice } from './slice';

export const StarBurstPanel: React.FC = () => {
    const starBurst = useCanvasStore(
        (state) => (state as CanvasStore & StarBurstPluginSlice).starBurst
    );
    const updateStarBurstState = useCanvasStore(
        (state) => (state as CanvasStore & StarBurstPluginSlice).updateStarBurstState
    );

    return (
        <Panel title="Star Burst" isCollapsible defaultOpen={true}>
            <SliderControl
                label="Rays"
                value={starBurst?.rays ?? 12}
                min={3}
                max={36}
                step={1}
                onChange={(val) => updateStarBurstState?.({ rays: val })}
            />
            <SliderControl
                label="Inner Radius"
                value={starBurst?.innerRadiusRatio ?? 0.4}
                min={0.1}
                max={0.9}
                step={0.05}
                onChange={(val) => updateStarBurstState?.({ innerRadiusRatio: val })}
            />
            <SectionHeader title="Ray Style" />
            <CustomSelect
                value={starBurst?.rayStyle ?? 'pointed'}
                onChange={(val) =>
                    updateStarBurstState?.({ rayStyle: val as 'pointed' | 'rounded' | 'flat' })
                }
                options={[
                    { label: 'Pointed', value: 'pointed' },
                    { label: 'Rounded', value: 'rounded' },
                    { label: 'Flat', value: 'flat' },
                ]}
            />
        </Panel>
    );
};
