import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { FractureToolPluginSlice } from './slice';

export const FractureToolPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const fractureTool = useCanvasStore(
        (state) => (state as CanvasStore & FractureToolPluginSlice).fractureTool
    );
    const updateFractureToolState = useCanvasStore(
        (state) => (state as CanvasStore & FractureToolPluginSlice).updateFractureToolState
    );

    return (
        <Panel title="Fracture Tool" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
            <SliderControl
                label="Pieces"
                value={fractureTool?.numPieces ?? 6}
                min={2}
                max={20}
                step={1}
                onChange={(val) => updateFractureToolState?.({ numPieces: val })}
            />
            <SectionHeader title="Pattern" />
            <JoinedButtonGroup
                options={[
                    { label: 'Voronoi', value: 'voronoi' },
                    { label: 'Grid', value: 'grid' },
                    { label: 'Radial', value: 'radial' },
                ]}
                value={fractureTool?.pattern ?? 'voronoi'}
                onChange={(val) =>
                    updateFractureToolState?.({ pattern: val as 'voronoi' | 'grid' | 'radial' })
                }
                size="sm"
                fullWidth
            />
        </Panel>
    );
};
