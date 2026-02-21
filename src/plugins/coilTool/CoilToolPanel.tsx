import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { CoilToolPluginSlice } from './slice';

export const CoilToolPanel: React.FC = () => {
    const coilTool = useCanvasStore(
        (state) => (state as CanvasStore & CoilToolPluginSlice).coilTool
    );
    const updateCoilToolState = useCanvasStore(
        (state) => (state as CanvasStore & CoilToolPluginSlice).updateCoilToolState
    );

    return (
        <Panel title="Coil Tool" isCollapsible defaultOpen={true}>
            <SliderControl
                label="Coil Radius"
                value={coilTool?.coilRadius ?? 15}
                min={3}
                max={50}
                step={1}
                onChange={(val) => updateCoilToolState?.({ coilRadius: val })}
            />
            <SliderControl
                label="Turns"
                value={coilTool?.turns ?? 12}
                min={2}
                max={40}
                step={1}
                onChange={(val) => updateCoilToolState?.({ turns: val })}
            />
            <SectionHeader title="Options" />
            <PanelSwitch
                isChecked={coilTool?.taper ?? false}
                onChange={(e) => updateCoilToolState?.({ taper: e.target.checked })}
                aria-label="Taper coil"
            >
                Taper
            </PanelSwitch>
        </Panel>
    );
};
