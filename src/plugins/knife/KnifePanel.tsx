import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { KnifePluginSlice } from './slice';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';

export const KnifePanel: React.FC = () => {
    const knife = useCanvasStore(
        (state) => (state as CanvasStore & KnifePluginSlice).knife
    );
    const updateKnifeState = useCanvasStore(
        (state) => (state as CanvasStore & KnifePluginSlice).updateKnifeState
    );

    return (
        <Panel title="Knife Tool" isCollapsible defaultOpen={true}>
            <RenderCountBadgeWrapper componentName="KnifePanel" position="top-left" />
            <SliderControl
                label="Cut Width"
                value={knife?.cutWidth ?? 2}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(val) => updateKnifeState?.({ cutWidth: val })}
            />
        </Panel>
    );
};
