import React from 'react';
import { Panel } from '../../ui/Panel';
import { SectionHeader } from '../../ui/SectionHeader';
import { JoinedButtonGroup } from '../../ui/JoinedButtonGroup';
import { useCanvasStore, type CanvasStore } from '../../store/canvasStore';
import type { ShapeCutterPluginSlice } from './slice';

export const ShapeCutterPanel: React.FC<{ hideTitle?: boolean }> = ({ hideTitle = false }) => {
    const shapeCutter = useCanvasStore(
        (state) => (state as CanvasStore & ShapeCutterPluginSlice).shapeCutter
    );
    const updateShapeCutterState = useCanvasStore(
        (state) => (state as CanvasStore & ShapeCutterPluginSlice).updateShapeCutterState
    );

    return (
        <Panel title="Shape Cutter" hideHeader={hideTitle} isCollapsible defaultOpen={true}>
            <SectionHeader title="Mode" />
            <JoinedButtonGroup
                options={[
                    { value: 'subtract', label: 'Subtract', description: 'Remove the drawn region' },
                    { value: 'intersect', label: 'Intersect', description: 'Keep only the drawn region' },
                ]}
                value={shapeCutter?.mode ?? 'subtract'}
                onChange={(val) =>
                    updateShapeCutterState?.({ mode: val as 'subtract' | 'intersect' })
                }
                size="sm"
                fullWidth
            />
        </Panel>
    );
};
