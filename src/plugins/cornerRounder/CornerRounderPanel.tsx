import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { CornerRounderPluginSlice } from './slice';

export const CornerRounderPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const cornerRounder = useCanvasStore(
        (state) => (state as CanvasStore & CornerRounderPluginSlice).cornerRounder
    );
    const updateCornerRounderState = useCanvasStore(
        (state) => (state as CanvasStore & CornerRounderPluginSlice).updateCornerRounderState
    );

    return (
        <Panel title="Corner Rounder" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
            <SliderControl
                label="Round Radius"
                value={cornerRounder?.roundRadius ?? 10}
                min={1}
                max={50}
                step={0.5}
                onChange={(val) => updateCornerRounderState?.({ roundRadius: val })}
            />
            <SliderControl
                label="Brush Size"
                value={cornerRounder?.brushSize ?? 20}
                min={5}
                max={80}
                step={1}
                onChange={(val) => updateCornerRounderState?.({ brushSize: val })}
            />
        </Panel>
    );
};
