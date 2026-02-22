import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ScallopToolPluginSlice } from './slice';

export const ScallopToolPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const scallopTool = useCanvasStore(
        (state) => (state as CanvasStore & ScallopToolPluginSlice).scallopTool
    );
    const updateScallopToolState = useCanvasStore(
        (state) => (state as CanvasStore & ScallopToolPluginSlice).updateScallopToolState
    );

    return (
        <Panel title="Scallop Tool" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
            <SliderControl
                label="Brush Radius"
                value={scallopTool?.brushRadius ?? 30}
                min={5}
                max={80}
                step={1}
                onChange={(val) => updateScallopToolState?.({ brushRadius: val })}
            />
            <SliderControl
                label="Scallop Size"
                value={scallopTool?.scallopSize ?? 5}
                min={1}
                max={20}
                step={0.5}
                onChange={(val) => updateScallopToolState?.({ scallopSize: val })}
            />
            <SliderControl
                label="Complexity"
                value={scallopTool?.complexity ?? 3}
                min={1}
                max={6}
                step={1}
                onChange={(val) => updateScallopToolState?.({ complexity: val })}
            />
        </Panel>
    );
};
