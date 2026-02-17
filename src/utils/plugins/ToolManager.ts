import { PluginRegistry } from './PluginRegistry';

export class ToolManager {
    constructor(private registry: PluginRegistry) { }

    getAlwaysShownTools(): string[] {
        const tools: string[] = [];
        for (const [pluginId, plugin] of this.registry.entries()) {
            if (plugin.toolDefinition && plugin.toolDefinition.visibility === 'always-shown') {
                tools.push(pluginId);
            }
        }
        return tools;
    }

    getDynamicTools(): string[] {
        const tools: string[] = [];
        for (const [pluginId, plugin] of this.registry.entries()) {
            if (plugin.toolDefinition && (!plugin.toolDefinition.visibility || plugin.toolDefinition.visibility === 'dynamic')) {
                tools.push(pluginId);
            }
        }
        return tools;
    }

    getAllTools(): string[] {
        const tools: string[] = [];
        for (const [pluginId, plugin] of this.registry.entries()) {
            if (plugin.toolDefinition) {
                tools.push(pluginId);
            }
        }
        return tools;
    }
}
