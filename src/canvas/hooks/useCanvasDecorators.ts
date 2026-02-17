import { useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../../store/canvasStore';
import { pluginManager } from '../../utils/pluginManager';
import {
    selectGridEnabled,
    selectGridShowRulers,
    selectGuidelinesEnabled,
    selectGuidelinesManualEnabled,
} from '../pluginStateSelectors';

export const useCanvasDecorators = () => {
    // Subscribe only to properties typically used by decorators' isVisible checks.
    // This reduces unnecessary re-renders compared to subscribing to the entire store.
    // If a decorator needs to check other properties, add them here.
    const decoratorState = useCanvasStore(
        useShallow((state) => ({
            settings: state.settings,
            viewport: state.viewport,
            activePlugin: state.activePlugin,
            // Grid and guidelines state needed for ruler decorators visibility
            gridEnabled: selectGridEnabled(state),
            gridShowRulers: selectGridShowRulers(state),
            guidelinesEnabled: selectGuidelinesEnabled(state),
            guidelinesManualEnabled: selectGuidelinesManualEnabled(state),
        }))
    );

    // Cache decorators list - only changes when plugins are registered/unregistered
    const beforeCanvasDecoratorsRef = useRef(pluginManager.getCanvasDecoratorsByPlacement('before-canvas'));
    
    // Update ref if decorator count changes (plugin registered/unregistered)
    const currentDecorators = pluginManager.getCanvasDecoratorsByPlacement('before-canvas');
    if (currentDecorators.length !== beforeCanvasDecoratorsRef.current.length) {
        beforeCanvasDecoratorsRef.current = currentDecorators;
    }

    // Calculate visible decorators reactively based on current store state
    // getState() is called inside useMemo so decorators always see fresh state
    // when decoratorState triggers re-evaluation.
    const visibleDecorators = useMemo(() => {
        const currentState = useCanvasStore.getState();
        return beforeCanvasDecoratorsRef.current.filter(d => d.isVisible(currentState));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [decoratorState]); // React to decoratorState changes, but pass full state to isVisible

    // Calculate total offset from visible decorators
    const decoratorOffset = useMemo(() => {
        let top = 0;
        let left = 0;
        let width = 0;
        let height = 0;

        for (const decorator of visibleDecorators) {
            if (decorator.getOffset) {
                const offset = decorator.getOffset();
                top = Math.max(top, offset.top);
                left = Math.max(left, offset.left);
                width = Math.max(width, offset.width);
                height = Math.max(height, offset.height);
            }
        }

        return { top, left, width, height };
    }, [visibleDecorators]);

    const hasDecorators = decoratorOffset.width > 0 || decoratorOffset.height > 0;

    return {
        visibleDecorators,
        decoratorOffset,
        hasDecorators,
    };
};
