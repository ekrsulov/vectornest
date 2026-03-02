import React, { useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { Point } from '../types';
import type { PluginHookContribution, PluginHooksContext } from '../types/plugins';
import { pluginManager } from '../utils/pluginManager';
import { usePluginRegistrationVersion } from '../hooks/usePluginRegistrationVersion';

interface PluginHooksProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
}

const ActiveHookContribution = ({
  contribution,
  hooksContext,
}: {
  contribution: PluginHookContribution;
  hooksContext: PluginHooksContext;
}) => {
  contribution.hook(hooksContext);
  return null;
};

const HookContributionRenderer = ({
  contribution,
  hooksContext,
}: {
  contribution: PluginHookContribution;
  hooksContext: PluginHooksContext;
}) => {
  const isActive = useCanvasStore((state) => contribution.when?.(state as Record<string, unknown>, hooksContext) ?? true);

  if (!isActive) {
    return null;
  }

  return (
    <ActiveHookContribution
      contribution={contribution}
      hooksContext={hooksContext}
    />
  );
};

const PluginHooksWrapper = ({
  pluginId,
  hooksContext,
}: {
  pluginId: string;
  hooksContext: PluginHooksContext;
}) => {
  const pluginHooks = pluginManager.getPluginHooks(pluginId);

  return (
    <>
      {pluginHooks.map((contribution) => (
        <HookContributionRenderer
          key={`${pluginId}:${contribution.id}`}
          contribution={contribution}
          hooksContext={hooksContext}
        />
      ))}
    </>
  );
};

const GlobalPluginHooksWrapper = ({ hooksContext }: { hooksContext: PluginHooksContext }) => {
  const globalPluginHooks = pluginManager.getGlobalPluginHooks();

  return (
    <>
      {globalPluginHooks.map((contribution) => (
        <HookContributionRenderer
          key={`global:${contribution.id}`}
          contribution={contribution}
          hooksContext={hooksContext}
        />
      ))}
    </>
  );
};

export const PluginHooksRenderer = ({ svgRef, screenToCanvas, emitPointerEvent }: PluginHooksProps) => {
  const registrationVersion = usePluginRegistrationVersion();
  const activePlugin = useCanvasStore(state => state.activePlugin);
  const viewportZoom = useCanvasStore(state => state.viewport.zoom);
  const scaleStrokeWithZoom = useCanvasStore(state => state.settings.scaleStrokeWithZoom);
  void registrationVersion;

  // Create context object to pass to hooks
  const hooksContext = useMemo<PluginHooksContext>(() => ({
    svgRef,
    screenToCanvas,
    emitPointerEvent,
    activePlugin,
    viewportZoom,
    scaleStrokeWithZoom,
  }), [svgRef, screenToCanvas, emitPointerEvent, activePlugin, viewportZoom, scaleStrokeWithZoom]);

  return (
    <>
      <GlobalPluginHooksWrapper hooksContext={hooksContext} />
      {activePlugin && (
        <PluginHooksWrapper
          key={activePlugin}
          pluginId={activePlugin}
          hooksContext={hooksContext}
        />
      )}
    </>
  );
};
