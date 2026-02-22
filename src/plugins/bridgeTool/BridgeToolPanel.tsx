import React from 'react';
import { Panel } from '../../ui/Panel';
import { SliderControl } from '../../ui/SliderControl';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { SectionHeader } from '../../ui/SectionHeader';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { BridgeToolPluginSlice } from './slice';

export const BridgeToolPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const bridgeTool = useCanvasStore(
        (state) => (state as CanvasStore & BridgeToolPluginSlice).bridgeTool
    );
    const updateBridgeToolState = useCanvasStore(
        (state) => (state as CanvasStore & BridgeToolPluginSlice).updateBridgeToolState
    );

    return (
        <Panel title="Bridge Tool" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
            <SliderControl
                label="Bridge Width"
                value={bridgeTool?.bridgeWidth ?? 8}
                min={1}
                max={40}
                step={1}
                onChange={(val) => updateBridgeToolState?.({ bridgeWidth: val })}
            />
            <SectionHeader title="Options" />
            <PanelSwitch
                isChecked={bridgeTool?.smooth ?? true}
                onChange={(e) => updateBridgeToolState?.({ smooth: e.target.checked })}
                aria-label="Smooth bridge path"
            >
                Smooth Path
            </PanelSwitch>
        </Panel>
    );
};
