import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { StampBrushPluginSlice } from './slice';

export const StampBrushPanel: React.FC = () => {
    const stampBrush = useCanvasStore(
        (state) => (state as CanvasStore & StampBrushPluginSlice).stampBrush
    );
    const updateStampBrushState = useCanvasStore(
        (state) => (state as CanvasStore & StampBrushPluginSlice).updateStampBrushState
    );

    return (
        <Panel title="Stamp Brush" isCollapsible defaultOpen={true}>
            <SliderControl
                label="Spacing"
                value={stampBrush?.spacing ?? 40}
                min={5}
                max={150}
                step={1}
                onChange={(val) => updateStampBrushState?.({ spacing: val })}
            />
            <SliderControl
                label="Size"
                value={stampBrush?.sizeMultiplier ?? 1.0}
                min={0.1}
                max={3.0}
                step={0.1}
                onChange={(val) => updateStampBrushState?.({ sizeMultiplier: val })}
            />
            <SliderControl
                label="Scale Variation"
                value={stampBrush?.scaleVariation ?? 0.2}
                min={0}
                max={1}
                step={0.05}
                onChange={(val) => updateStampBrushState?.({ scaleVariation: val })}
            />
            <SliderControl
                label="Rotation Variation"
                value={stampBrush?.rotationVariation ?? 15}
                min={0}
                max={180}
                step={1}
                onChange={(val) => updateStampBrushState?.({ rotationVariation: val })}
            />
        </Panel>
    );
};
