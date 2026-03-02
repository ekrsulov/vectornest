import React, { useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { usePluginRegistrationVersion } from '../hooks/usePluginRegistrationVersion';
import { pluginManager } from '../utils/pluginManager';
import { IOS_EDGE_GUARD } from '../constants';
import { isPluginEnabledInState } from '../utils/plugins/PluginBehaviorApi';

const IOS_EDGE_GUARD_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: `${IOS_EDGE_GUARD.WIDTH}px`,
  height: '100%',
  zIndex: IOS_EDGE_GUARD.Z_INDEX,
  touchAction: 'none',
  backgroundColor: 'transparent',
};

interface IOSEdgeGuardProps {
  isIOS: boolean;
}

/**
 * Invisible overlay to prevent iOS back swipe from left edge.
 * Only renders on iOS devices.
 */
const IOSEdgeGuard: React.FC<IOSEdgeGuardProps> = ({ isIOS }) => {
  if (!isIOS) return null;

  return (
    <div style={IOS_EDGE_GUARD_STYLE} />
  );
};

IOSEdgeGuard.displayName = 'IOSEdgeGuard';

interface GlobalOverlaysProps {
  /** Whether the device is iOS (for edge guard) */
  isIOS?: boolean;
}

interface GlobalOverlayEntry {
  id: string;
  pluginId: string;
  component: React.ComponentType<Record<string, unknown>>;
  condition?: (ctx: {
    activePlugin: string | null;
    state: Record<string, unknown>;
  }) => boolean;
}

const GlobalOverlaySlot: React.FC<{ overlay: GlobalOverlayEntry }> = React.memo(({ overlay }) => {
  const isVisible = useCanvasStore((state) => {
    const storeState = state as Record<string, unknown>;
    if (!isPluginEnabledInState(storeState, overlay.pluginId)) {
      return false;
    }

    if (!overlay.condition) {
      return true;
    }

    try {
      return overlay.condition({
        activePlugin: state.activePlugin ?? null,
        state: storeState,
      });
    } catch {
      return false;
    }
  });

  if (!isVisible) {
    return null;
  }

  const OverlayComponent = overlay.component;
  return <OverlayComponent />;
});

GlobalOverlaySlot.displayName = 'GlobalOverlaySlot';

/**
 * Renders global overlays from plugins and iOS edge guard.
 * Extracted from App.tsx to reduce complexity.
 */
export const GlobalOverlays: React.FC<GlobalOverlaysProps> = ({ isIOS = false }) => {
  const registrationVersion = usePluginRegistrationVersion();
  const globalOverlays = useMemo<GlobalOverlayEntry[]>(
    () => {
      return pluginManager.getAll().flatMap((plugin) =>
        (plugin.overlays ?? []).map((overlay) => ({
          id: `${plugin.id}:${overlay.id}`,
          pluginId: plugin.id,
          component: overlay.component as React.ComponentType<Record<string, unknown>>,
          condition: overlay.condition,
        }))
      );
    },
    // registrationVersion is intentionally used as a cache-buster to recompute
    // when plugins register/unregister, even though it's not read in the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registrationVersion]
  );

  return (
    <>
      {/* iOS back swipe prevention */}
      <IOSEdgeGuard isIOS={isIOS} />

      {/* Render global overlays from plugins */}
      {globalOverlays.map((overlay) => {
        return <GlobalOverlaySlot key={overlay.id} overlay={overlay} />;
      })}
    </>
  );
};
