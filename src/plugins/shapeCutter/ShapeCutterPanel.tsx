import React from 'react';
import { Panel } from '../../ui/Panel';
import { SectionHeader } from '../../ui/SectionHeader';
import { CustomSelect } from '../../ui/CustomSelect';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ShapeCutterPluginSlice } from './slice';

export const ShapeCutterPanel: React.FC = () => {
    const shapeCutter = useCanvasStore(
        (state) => (state as CanvasStore & ShapeCutterPluginSlice).shapeCutter
    );
    const updateShapeCutterState = useCanvasStore(
        (state) => (state as CanvasStore & ShapeCutterPluginSlice).updateShapeCutterState
    );

    return (
        <Panel title="Shape Cutter" isCollapsible defaultOpen={true}>
            <SectionHeader title="Mode" />
            <CustomSelect
                value={shapeCutter?.mode ?? 'subtract'}
                options={[
                    { value: 'subtract', label: 'Subtract (remove region)' },
                    { value: 'intersect', label: 'Intersect (keep region)' },
                ]}
                onChange={(val) =>
                    updateShapeCutterState?.({ mode: val as 'subtract' | 'intersect' })
                }
            />
        </Panel>
    );
};
