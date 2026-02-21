import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { CustomSelect } from '../../ui/CustomSelect';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { StippleBrushPluginSlice } from './slice';

export const StippleBrushPanel: React.FC = () => {
    const stippleBrush = useCanvasStore(
        (state) => (state as CanvasStore & StippleBrushPluginSlice).stippleBrush
    );
    const updateStippleBrushState = useCanvasStore(
        (state) => (state as CanvasStore & StippleBrushPluginSlice).updateStippleBrushState
    );

    return (
        <Panel title="Stipple Brush" isCollapsible defaultOpen={true}>
            <SliderControl
                label="Brush Radius"
                value={stippleBrush?.brushRadius ?? 30}
                min={5}
                max={80}
                step={1}
                onChange={(val) => updateStippleBrushState?.({ brushRadius: val })}
            />
            <SliderControl
                label="Min Dot Size"
                value={stippleBrush?.dotSizeMin ?? 0.5}
                min={0.2}
                max={5}
                step={0.1}
                onChange={(val) => updateStippleBrushState?.({ dotSizeMin: val })}
            />
            <SliderControl
                label="Max Dot Size"
                value={stippleBrush?.dotSizeMax ?? 3}
                min={0.5}
                max={10}
                step={0.1}
                onChange={(val) => updateStippleBrushState?.({ dotSizeMax: val })}
            />
            <SliderControl
                label="Density"
                value={stippleBrush?.density ?? 12}
                min={1}
                max={40}
                step={1}
                onChange={(val) => updateStippleBrushState?.({ density: val })}
            />
            <SectionHeader title="Size Distribution" />
            <CustomSelect
                value={stippleBrush?.sizeDistribution ?? 'uniform'}
                onChange={(val) =>
                    updateStippleBrushState?.({
                        sizeDistribution: val as 'uniform' | 'center-heavy' | 'edge-heavy',
                    })
                }
                options={[
                    { label: 'Uniform', value: 'uniform' },
                    { label: 'Center Heavy', value: 'center-heavy' },
                    { label: 'Edge Heavy', value: 'edge-heavy' },
                ]}
            />
        </Panel>
    );
};
