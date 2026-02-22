import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { SprayCanPluginSlice } from './slice';

export const SprayCanPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const sprayCan = useCanvasStore(
        (state) => (state as CanvasStore & SprayCanPluginSlice).sprayCan
    );
    const updateSprayCanState = useCanvasStore(
        (state) => (state as CanvasStore & SprayCanPluginSlice).updateSprayCanState
    );

    return (
        <Panel title="Spray Can" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
            <SliderControl
                label="Spray Radius"
                value={sprayCan?.sprayRadius ?? 40}
                min={5}
                max={100}
                step={1}
                onChange={(val) => updateSprayCanState?.({ sprayRadius: val })}
            />
            <SliderControl
                label="Dot Size"
                value={sprayCan?.dotSize ?? 4}
                min={1}
                max={20}
                step={0.5}
                onChange={(val) => updateSprayCanState?.({ dotSize: val })}
            />
            <SliderControl
                label="Density"
                value={sprayCan?.density ?? 8}
                min={1}
                max={30}
                step={1}
                onChange={(val) => updateSprayCanState?.({ density: val })}
            />
        </Panel>
    );
};
