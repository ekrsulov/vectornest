import type React from 'react';
import type {
  PluginContextFull,
  PluginHandlerHelpers,
} from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { Point } from '../../types';
import { buildPluginContext } from '../pluginContextBuilder';
import {
  PluginManagerServicesCore,
} from './PluginManagerServicesCore';
import type { PluginManagerOptions } from './PluginManagerBase';

export class PluginManager extends PluginManagerServicesCore {
  constructor(options: PluginManagerOptions = {}) {
    super(options);
  }

  executeHandler(
    toolName: string,
    event: React.PointerEvent,
    point: Point,
    target: Element,
    helpers: PluginHandlerHelpers
  ): void {
    if (!this.isPluginEnabled(toolName)) {
      return;
    }

    const tool = this.registry.get(toolName);
    if (tool?.handler) {
      const api = this.pluginApis.get(toolName) ?? {};
      const context = buildPluginContext({
        store: this.createPluginApiContext().store,
        api,
        helpers,
        pluginApis: this.pluginApis,
      });
      tool.handler(event, point, target, context);
    }
  }

  protected createPluginContext(pluginId: string): PluginContextFull<CanvasStore> {
    if (!this.contextManager) {
      const api = this.pluginApis.get(pluginId) ?? {};
      return buildPluginContext({
        store: this.createPluginApiContext().store,
        api,
        helpers: {},
        pluginApis: this.pluginApis,
      });
    }

    const context = this.contextManager.createHandlerContext(pluginId);
    context.helpers = this.helpers.getAll();

    return context;
  }
}
