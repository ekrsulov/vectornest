import type { StoreApi } from 'zustand';
import type { Point } from '.';
import type { CanvasControllerActions } from '../canvas/controller/CanvasControllerContext';
import type { CanvasEventBus, CanvasPointerEventState } from '../canvas/CanvasEventBusContext';
import type { StoreAccessor } from '../utils/plugins/StoreAccessor';

export type CanvasShortcutStoreApi = Pick<StoreApi<object>, 'getState' | 'subscribe'>;

export interface CanvasShortcutContext {
  eventBus: CanvasEventBus;
  controller: CanvasControllerActions;
  store: CanvasShortcutStoreApi;
  svg?: SVGSVGElement | null;
}

export type CanvasShortcutHandler = (event: KeyboardEvent, context: CanvasShortcutContext) => void;

export interface CanvasShortcutOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  allowWhileTyping?: boolean;
  when?: (context: CanvasShortcutContext, event: KeyboardEvent) => boolean;
}

export interface CanvasShortcutDefinition {
  handler: CanvasShortcutHandler;
  options?: CanvasShortcutOptions;
}

export type CanvasShortcutMap = Record<string, CanvasShortcutDefinition | CanvasShortcutHandler>;

export type PluginStoreApi<TStore extends object> = Pick<StoreApi<TStore>, 'getState' | 'setState' | 'subscribe'>;

export interface PluginApiContext<TStore extends object> {
  store: PluginStoreApi<TStore>;
}

export interface ColorModeChangeContext<TStore extends object> {
  prevColorMode: 'light' | 'dark';
  nextColorMode: 'light' | 'dark';
  store: PluginStoreApi<TStore>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginHandlerHelpers = Record<string, (...args: any[]) => any>;

export type PluginApiFactory<TStore extends object> = (
  context: PluginApiContext<TStore>
) => Record<string, (...args: never[]) => unknown>;

export type PluginSliceFactory<TStore extends object = object> = (
  set: StoreApi<TStore>['setState'],
  get: StoreApi<TStore>['getState'],
  api: StoreApi<TStore>
) => {
  state: Partial<TStore>;
  cleanup?: (
    set: StoreApi<TStore>['setState'],
    get: StoreApi<TStore>['getState'],
    api: StoreApi<TStore>
  ) => void;
};

export interface PluginHooksContext {
  svgRef: React.RefObject<SVGSVGElement | null>;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
  activePlugin: string | null;
  viewportZoom: number;
  scaleStrokeWithZoom: boolean;
}

export interface PluginContextBase {
  activePlugin: string | null;
  viewportZoom: number;
  scaleStrokeWithZoom: boolean;
  colorMode: 'light' | 'dark';
}

export interface PluginContextWithStore<TStore extends object> extends PluginContextBase {
  store: PluginStoreApi<TStore>;
  accessor: StoreAccessor<TStore>;
}

export interface PluginContextWithApi<TStore extends object> extends PluginContextWithStore<TStore> {
  api: Record<string, (...args: never[]) => unknown>;
}

export interface PluginContextWithCanvas extends PluginContextBase {
  svgRef: React.RefObject<SVGSVGElement | null>;
  screenToCanvas: (x: number, y: number) => Point;
  emitPointerEvent: (
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    event: PointerEvent,
    point: Point
  ) => void;
}

export interface PluginContextWithHelpers {
  helpers: PluginHandlerHelpers;
}

export interface PluginContextWithPointer {
  pointerState?: CanvasPointerEventState;
}

export interface PluginContextWithDependencies {
  requireDep: <T = unknown>(pluginId: string) => T;
  optionalDep: <T = unknown>(pluginId: string) => T | undefined;
  hasDep: (pluginId: string) => boolean;
}

export interface PluginContextFull<TStore extends object>
  extends
    PluginContextWithApi<TStore>,
    PluginContextWithCanvas,
    PluginContextWithHelpers,
    PluginContextWithPointer,
    PluginContextWithDependencies {}

export interface ContextCapability<TCapability extends string> {
  __capability: TCapability;
}

export function createContextWithCapability<
  TStore extends object,
  TCapability extends string
>(
  baseContext: PluginContextFull<TStore>,
  capability: TCapability
): PluginContextFull<TStore> & ContextCapability<TCapability> {
  return {
    ...baseContext,
    __capability: capability,
  } as PluginContextFull<TStore> & ContextCapability<TCapability>;
}

export interface PluginHookContribution {
  id: string;
  hook: (context: PluginHooksContext) => void;
  global?: boolean;
}
