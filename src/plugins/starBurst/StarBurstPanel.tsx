import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { StarBurstPluginSlice } from './slice';

export const StarBurstPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const starBurst = useCanvasStore(
        (state) => (state as CanvasStore & StarBurstPluginSlice).starBurst
    );
    const updateStarBurstState = useCanvasStore(
        (state) => (state as CanvasStore & StarBurstPluginSlice).updateStarBurstState
    );

    return (
        <Panel title="Star Burst" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
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
            <JoinedButtonGroup
                options={[
                    { label: 'Pointed', value: 'pointed' },
                    { label: 'Rounded', value: 'rounded' },
                    { label: 'Flat', value: 'flat' },
                ]}
                value={starBurst?.rayStyle ?? 'pointed'}
                onChange={(val) =>
                    updateStarBurstState?.({ rayStyle: val as 'pointed' | 'rounded' | 'flat' })
                }
                size="sm"
                fullWidth
            />
        </Panel>
    );
};
