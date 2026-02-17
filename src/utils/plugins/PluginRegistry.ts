import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';

export class PluginRegistry {
    private registry = new Map<string, PluginDefinition<CanvasStore>>();
    private cachedAll: PluginDefinition<CanvasStore>[] | null = null;

    register(plugin: PluginDefinition<CanvasStore>): void {
        this.registry.set(plugin.id, plugin);
        this.cachedAll = null;
    }

    unregister(pluginId: string): void {
        this.registry.delete(pluginId);
        this.cachedAll = null;
    }

    get(pluginId: string): PluginDefinition<CanvasStore> | undefined {
        return this.registry.get(pluginId);
    }

    has(pluginId: string): boolean {
        return this.registry.has(pluginId);
    }

    /** Returns a cached array of all registered plugins. Invalidated on register/unregister. */
    getAll(): PluginDefinition<CanvasStore>[] {
        if (!this.cachedAll) {
            this.cachedAll = Array.from(this.registry.values());
        }
        return this.cachedAll;
    }

    entries(): IterableIterator<[string, PluginDefinition<CanvasStore>]> {
        return this.registry.entries();
    }

    values(): IterableIterator<PluginDefinition<CanvasStore>> {
        return this.registry.values();
    }
}
