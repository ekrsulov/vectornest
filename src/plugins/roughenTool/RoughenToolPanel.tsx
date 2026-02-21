import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { RoughenToolPluginSlice } from './slice';

export const RoughenToolPanel: React.FC = () => {
    const roughenTool = useCanvasStore(
        (state) => (state as CanvasStore & RoughenToolPluginSlice).roughenTool
    );
    const updateRoughenToolState = useCanvasStore(
        (state) => (state as CanvasStore & RoughenToolPluginSlice).updateRoughenToolState
    );

    return (
        <Panel title="Roughen Tool" isCollapsible defaultOpen={true}>
            <SliderControl
                label="Brush Radius"
                value={roughenTool?.roughenRadius ?? 30}
                min={5}
                max={80}
                step={1}
                onChange={(val) => updateRoughenToolState?.({ roughenRadius: val })}
            />
            <SliderControl
                label="Intensity"
                value={roughenTool?.intensity ?? 5}
                min={0.5}
                max={20}
                step={0.5}
                onChange={(val) => updateRoughenToolState?.({ intensity: val })}
            />
            <SliderControl
                label="Detail"
                value={roughenTool?.detail ?? 4}
                min={0}
                max={8}
                step={1}
                onChange={(val) => updateRoughenToolState?.({ detail: val })}
            />
        </Panel>
    );
};
