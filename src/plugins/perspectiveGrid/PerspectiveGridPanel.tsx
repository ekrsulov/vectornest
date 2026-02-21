import React from 'react';
import { Panel } from '../../ui/Panel';
import { PanelSwitch } from '../../ui/PanelSwitch';
import { PanelToggle } from '../../ui/PanelToggle';
import { CustomSelect } from '../../ui/CustomSelect';
import { SliderControl } from '../../ui/SliderControl';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { PerspectiveGridPluginSlice, PerspectiveMode } from './slice';

export const PerspectiveGridPanel: React.FC = () => {
    const pGrid = useCanvasStore(
        (state) => (state as CanvasStore & PerspectiveGridPluginSlice).perspectiveGrid
    );
    const updatePerspectiveGridState = useCanvasStore(
        (state) => (state as CanvasStore & PerspectiveGridPluginSlice).updatePerspectiveGridState
    );

    const modeOptions = [
        { value: '1-point', label: '1-Point Perspective' },
        { value: '2-point', label: '2-Point Perspective' },
        { value: '3-point', label: '3-Point Perspective' }
    ];

    return (
        <Panel
            title="Perspective Grid"
            isCollapsible={pGrid?.enabled ?? false}
            defaultOpen={false}
            headerActions={
                <PanelSwitch
                    isChecked={pGrid?.enabled ?? false}
                    onChange={(e) => updatePerspectiveGridState?.({ enabled: e.target.checked })}
                    aria-label="Toggle perspective grid"
                />
            }
        >
            {pGrid?.enabled && (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>Mode</span>
                        <CustomSelect
                            value={pGrid?.mode ?? '2-point'}
                            options={modeOptions}
                            onChange={(val: string) => updatePerspectiveGridState?.({ mode: val as PerspectiveMode })}
                        />
                    </div>
                    <SliderControl
                        label="Grid Density"
                        value={pGrid?.gridDensity ?? 10}
                        min={4}
                        max={30}
                        step={1}
                        onChange={(val) => updatePerspectiveGridState?.({ gridDensity: val })}
                    />
                    <PanelToggle
                        isChecked={pGrid?.snapEnabled ?? true}
                        onChange={(e) => updatePerspectiveGridState?.({ snapEnabled: e.target.checked })}
                    >
                        Snap to Grid
                    </PanelToggle>
                </>
            )}
        </Panel>
    );
};
