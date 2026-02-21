import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { PathWeldPluginSlice } from './slice';

export const PathWeldPanel: React.FC = () => {
    const pathWeld = useCanvasStore(
        (state) => (state as CanvasStore & PathWeldPluginSlice).pathWeld
    );
    const updatePathWeldState = useCanvasStore(
        (state) => (state as CanvasStore & PathWeldPluginSlice).updatePathWeldState
    );

    return (
        <Panel title="Path Weld" isCollapsible defaultOpen={true}>
            <SliderControl
                label="Weld Width"
                value={pathWeld?.weldWidth ?? 4}
                min={1}
                max={30}
                step={0.5}
                onChange={(val) => updatePathWeldState?.({ weldWidth: val })}
            />
        </Panel>
    );
};
