import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { SmoothPaintPluginSlice } from './slice';

export const SmoothPaintPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const smoothPaint = useCanvasStore(
        (state) => (state as CanvasStore & SmoothPaintPluginSlice).smoothPaint
    );
    const updateSmoothPaintState = useCanvasStore(
        (state) => (state as CanvasStore & SmoothPaintPluginSlice).updateSmoothPaintState
    );

    if (!smoothPaint) return null;

    return (
        <Panel title="Smooth Paint" hideHeader={hideTitle} isCollapsible defaultOpen>
            <SliderControl
                label="Brush Radius"
                value={smoothPaint.brushRadius}
                min={5}
                max={80}
                step={1}
                onChange={(val) => updateSmoothPaintState?.({ brushRadius: val })}
            />
            <SliderControl
                label="Strength"
                value={smoothPaint.strength}
                min={1}
                max={10}
                step={1}
                onChange={(val) => updateSmoothPaintState?.({ strength: val })}
            />
            <PanelSwitch
                isChecked={smoothPaint.preserveShape}
                onChange={(e) =>
                    updateSmoothPaintState?.({ preserveShape: e.target.checked })
                }
                aria-label="Preserve shape"
            >
                Preserve Shape
            </PanelSwitch>
        </Panel>
    );
};
