import type { PluginHandlerHelper, PluginHandlerHelpers } from '../../types/plugins';

export class HelperRegistry {
    private helpers = new Map<string, PluginHandlerHelper>();
    private cachedAll: PluginHandlerHelpers | null = null;

    register(name: string, helperFn: PluginHandlerHelper): void {
        this.helpers.set(name, helperFn);
        this.cachedAll = null;
    }

    unregister(name: string): void {
        this.helpers.delete(name);
        this.cachedAll = null;
    }

    get<T = PluginHandlerHelper>(name: string): T | undefined {
        return this.helpers.get(name) as T | undefined;
    }

    /** Returns a cached snapshot of all helpers. Invalidated on register/unregister. */
    getAll(): PluginHandlerHelpers {
        if (!this.cachedAll) {
            this.cachedAll = Object.fromEntries(this.helpers);
        }
        return this.cachedAll;
    }
}
