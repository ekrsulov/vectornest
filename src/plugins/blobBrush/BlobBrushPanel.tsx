import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { BlobBrushPluginSlice } from './slice';
import { RenderCountBadgeWrapper } from '../../ui/RenderCountBadgeWrapper';

export const BlobBrushPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const blobBrush = useCanvasStore(
        (state) => (state as CanvasStore & BlobBrushPluginSlice).blobBrush
    );
    const updateBlobBrushState = useCanvasStore(
        (state) => (state as CanvasStore & BlobBrushPluginSlice).updateBlobBrushState
    );

    return (
        <Panel title="Blob Brush" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
            <RenderCountBadgeWrapper componentName="BlobBrushPanel" position="top-left" />
            <SliderControl
                label="Brush Size"
                value={blobBrush?.brushSize ?? 20}
                min={1}
                max={100}
                step={1}
                onChange={(val) => updateBlobBrushState?.({ brushSize: val })}
            />
        </Panel>
    );
};
