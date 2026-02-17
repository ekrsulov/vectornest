import type React from 'react';
import type { StoreApi } from 'zustand';
import type { CanvasPointerEventState } from '../canvas/CanvasEventBusContext';
import type { Point } from '../types';
import type { PluginContextFull, PluginHandlerHelpers } from '../types/plugins';
import type { StoreAccessor } from './plugins/StoreAccessor';
import { createStoreAccessor } from './plugins/StoreAccessor';

type PointerEventType = 'pointerdown' | 'pointermove' | 'pointerup';

export type PluginContextStoreLike<TStore extends object> = Pick<
  StoreApi<TStore>,
  'getState' | 'setState' | 'subscribe'
>;

export interface BuildPluginContextOptions<TStore extends object> {
  store: PluginContextStoreLike<TStore>;
  api?: Record<string, (...args: unknown[]) => unknown>;
  helpers?: PluginHandlerHelpers;
  pointerState?: CanvasPointerEventState;
  accessor?: StoreAccessor<TStore>;
  pluginApis?: ReadonlyMap<string, Record<string, (...args: unknown[]) => unknown>>;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  screenToCanvas?: (x: number, y: number) => Point;
  emitPointerEvent?: (
    type: PointerEventType,
    event: PointerEvent,
    point: Point
  ) => void;
  activePlugin?: string | null;
  viewportZoom?: number;
  scaleStrokeWithZoom?: boolean;
  colorMode?: 'light' | 'dark';
}

type BaseStateSnapshot = {
  activePlugin?: unknown;
  viewport?: {
    zoom?: unknown;
  };
  scaleStrokeWithZoom?: unknown;
  colorMode?: unknown;
};

const NULL_SVG_REF = { current: null } as React.RefObject<SVGSVGElement | null>;

const identityScreenToCanvas = (x: number, y: number): Point => ({ x, y });

const noopEmitPointerEvent = (
  _type: PointerEventType,
  _event: unknown,
  _point: Point
): void => {};

const resolveBaseState = <TStore extends object>(store: PluginContextStoreLike<TStore>) => {
  const snapshot = store.getState() as BaseStateSnapshot;

  const activePlugin =
    typeof snapshot.activePlugin === 'string' || snapshot.activePlugin === null
      ? snapshot.activePlugin
      : null;

  const viewportZoom =
    typeof snapshot.viewport?.zoom === 'number' ? snapshot.viewport.zoom : 1;

  const scaleStrokeWithZoom =
    typeof snapshot.scaleStrokeWithZoom === 'boolean'
      ? snapshot.scaleStrokeWithZoom
      : true;

  const colorMode: 'light' | 'dark' =
    snapshot.colorMode === 'dark' ? 'dark' : 'light';

  return {
    activePlugin,
    viewportZoom,
    scaleStrokeWithZoom,
    colorMode,
  };
};

/**
 * Build a fully typed PluginContextFull without unsafe `as unknown as` casts.
 */
export function buildPluginContext<TStore extends object>(
  options: BuildPluginContextOptions<TStore>
): PluginContextFull<TStore> {
  const {
    store,
    api = {},
    helpers = {},
    pointerState,
    accessor = createStoreAccessor(store),
    pluginApis,
    svgRef = NULL_SVG_REF,
    screenToCanvas = identityScreenToCanvas,
    emitPointerEvent = noopEmitPointerEvent,
  } = options;

  const baseState = resolveBaseState(store);
  const dependencyApis = pluginApis ?? new Map<string, Record<string, (...args: unknown[]) => unknown>>();

  const optionalDep = <T = unknown>(pluginId: string): T | undefined => {
    return dependencyApis.get(pluginId) as T | undefined;
  };

  const requireDep = <T = unknown>(pluginId: string): T => {
    const dependency = optionalDep<T>(pluginId);
    if (dependency === undefined) {
      throw new Error(`Plugin dependency "${pluginId}" is not available`);
    }
    return dependency;
  };

  return {
    store,
    accessor,
    api: api as PluginContextFull<TStore>['api'],
    helpers,
    pointerState,
    svgRef,
    screenToCanvas,
    emitPointerEvent: emitPointerEvent as PluginContextFull<TStore>['emitPointerEvent'],
    activePlugin: options.activePlugin ?? baseState.activePlugin,
    viewportZoom: options.viewportZoom ?? baseState.viewportZoom,
    scaleStrokeWithZoom:
      options.scaleStrokeWithZoom ?? baseState.scaleStrokeWithZoom,
    colorMode: options.colorMode ?? baseState.colorMode,
    requireDep,
    optionalDep,
    hasDep: (pluginId: string) => dependencyApis.has(pluginId),
  };
}
