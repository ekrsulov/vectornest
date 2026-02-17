export class HelperRegistry {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private helpers = new Map<string, (...args: any[]) => any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private cachedAll: Record<string, (...args: any[]) => any> | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register(name: string, helperFn: (...args: any[]) => any): void {
        this.helpers.set(name, helperFn);
        this.cachedAll = null;
    }

    unregister(name: string): void {
        this.helpers.delete(name);
        this.cachedAll = null;
    }

    get<T = unknown>(name: string): T | undefined {
        return this.helpers.get(name) as T | undefined;
    }

    /** Returns a cached snapshot of all helpers. Invalidated on register/unregister. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getAll(): Record<string, (...args: any[]) => any> {
        if (!this.cachedAll) {
            this.cachedAll = Object.fromEntries(this.helpers);
        }
        return this.cachedAll;
    }
}
