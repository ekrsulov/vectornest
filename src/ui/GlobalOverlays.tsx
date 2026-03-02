import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { usePluginRegistrationVersion } from '../hooks/usePluginRegistrationVersion';
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

interface GlobalOverlayEntry {
  id: string;
  component: React.ComponentType<Record<string, unknown>>;
}

/**
 * Renders global overlays from plugins and iOS edge guard.
 * Extracted from App.tsx to reduce complexity.
 */
export const GlobalOverlays: React.FC<GlobalOverlaysProps> = ({ isIOS = false }) => {
  usePluginRegistrationVersion();
  useCanvasStore((state) => state);

  const globalOverlays = pluginManager.getGlobalOverlays() as GlobalOverlayEntry[];

  return (
    <>
      {/* iOS back swipe prevention */}
      <IOSEdgeGuard isIOS={isIOS} />

      {/* Render global overlays from plugins */}
      {globalOverlays.map((overlay) => {
        const OverlayComponent = overlay.component;
        return <OverlayComponent key={overlay.id} />;
      })}
    </>
  );
};
