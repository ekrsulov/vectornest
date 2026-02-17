import React, { useState, useEffect, useCallback } from 'react';
import { pluginManager } from '../utils/pluginManager';
import { IOS_EDGE_GUARD } from '../constants';

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

interface GlobalOverlaysProps {
  /** Whether the device is iOS (for edge guard) */
  isIOS?: boolean;
}

/**
 * Renders global overlays from plugins and iOS edge guard.
 * Extracted from App.tsx to reduce complexity.
 */
export const GlobalOverlays: React.FC<GlobalOverlaysProps> = ({ isIOS = false }) => {
  // Get global overlays from plugins (includes MinimapPanel)
  const [globalOverlays, setGlobalOverlays] = useState<React.ComponentType<Record<string, unknown>>[]>(
    () => pluginManager.getGlobalOverlays() as React.ComponentType<Record<string, unknown>>[]
  );

  // Re-query overlays after plugin registration changes
  const refreshOverlays = useCallback(() => {
    setGlobalOverlays(pluginManager.getGlobalOverlays() as React.ComponentType<Record<string, unknown>>[]);
  }, []);

  // Subscribe to plugin registration events so late-registered overlays appear
  useEffect(() => {
    // Refresh on mount in case plugins registered before mount
    refreshOverlays();

    // Subscribe to plugin changes via pluginManager's listener mechanism
    const unsubscribe = pluginManager.onPluginRegistrationChange?.(refreshOverlays);
    return () => { unsubscribe?.(); };
  }, [refreshOverlays]);

  // Build stable keys from overlay component displayName or fallback
  const overlayKeys = globalOverlays.map(
    (Component, index) => Component.displayName || Component.name || `global-overlay-${index}`
  );

  return (
    <>
      {/* iOS back swipe prevention */}
      <IOSEdgeGuard isIOS={isIOS} />

      {/* Render global overlays from plugins */}
      {globalOverlays.map((OverlayComponent, index) => (
        <OverlayComponent key={overlayKeys[index]} />
      ))}
    </>
  );
};
