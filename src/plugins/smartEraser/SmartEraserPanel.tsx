import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { SmartEraserPluginSlice } from './slice';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';

export const SmartEraserPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const smartEraser = useCanvasStore(
        (state) => (state as CanvasStore & SmartEraserPluginSlice).smartEraser
    );
    const updateSmartEraserState = useCanvasStore(
        (state) => (state as CanvasStore & SmartEraserPluginSlice).updateSmartEraserState
    );

    return (
        <Panel title="Smart Eraser" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
            <RenderCountBadgeWrapper componentName="SmartEraserPanel" position="top-left" />
            <SliderControl
                label="Eraser Size"
                value={smartEraser?.eraserSize ?? 20}
                min={1}
                max={100}
                step={1}
                onChange={(val) => updateSmartEraserState?.({ eraserSize: val })}
            />
        </Panel>
    );
};
