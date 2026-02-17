import { createContext, useContext, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCanvasStore } from '../store/canvasStore';
import type { CanvasStore } from '../store/canvasStore';

export type SidebarPanelScope = 'right' | 'left';

export const SidebarPanelScopeContext = createContext<SidebarPanelScope>('right');

export function useSidebarPanelState() {
  const scope = useContext(SidebarPanelScopeContext);

  const { openPanelKey, setOpenPanelKey, maximizedPanelKey, setMaximizedPanelKey } =
    useCanvasStore(
      useShallow((state: CanvasStore) =>
        scope === 'left'
          ? {
              openPanelKey: state.leftOpenSidebarPanelKey,
              setOpenPanelKey: state.setLeftOpenSidebarPanelKey,
              maximizedPanelKey: state.leftMaximizedSidebarPanelKey,
              setMaximizedPanelKey: state.setLeftMaximizedSidebarPanelKey,
            }
          : {
              openPanelKey: state.openSidebarPanelKey,
              setOpenPanelKey: state.setOpenSidebarPanelKey,
              maximizedPanelKey: state.maximizedSidebarPanelKey,
              setMaximizedPanelKey: state.setMaximizedSidebarPanelKey,
            }
      )
    );

  return useMemo(
    () => ({
      scope,
      openPanelKey,
      setOpenPanelKey,
      maximizedPanelKey,
      setMaximizedPanelKey,
    }),
    [scope, openPanelKey, setOpenPanelKey, maximizedPanelKey, setMaximizedPanelKey]
  );
}

