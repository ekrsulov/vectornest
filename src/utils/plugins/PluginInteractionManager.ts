import React from 'react';
import type {
    PluginDefinition,
    CanvasShortcutDefinition,
    CanvasShortcutMap,
    CanvasShortcutOptions,
    PluginContextFull,
} from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import type { CanvasEventBus, CanvasPointerEventPayload, CanvasElementDoubleClickEventPayload, CanvasSubpathDoubleClickEventPayload, CanvasDoubleClickEventPayload, CanvasEventMap, CanvasPointerEventState } from '../../canvas/CanvasEventBusContext';
import { canvasShortcutRegistry } from '../../canvas/shortcuts';
import type { DragModifier, ElementDragModifier } from '../../types/interaction';
import type { PluginContextManager } from './PluginContextManager';

export class PluginInteractionManager {
    private interactionSubscriptions = new Map<string, Set<() => void>>();
    private shortcutSubscriptions = new Map<string, () => void>();
    private dragModifiers = new Map<string, DragModifier>();
    private elementDragModifiers = new Map<string, ElementDragModifier>();

    // Dependency injection for eventBus and storeApi access needs
    private eventBus: CanvasEventBus | null = null;
    // Dependency injection for unified context creation
    private contextManager: PluginContextManager | null = null;

    constructor() { }

    setEventBus(eventBus: CanvasEventBus | null): void {
        this.eventBus = eventBus;
    }

    getEventBus(): CanvasEventBus | null {
        return this.eventBus;
    }

    /**
     * Set the context manager for unified context creation.
     * When set, the interaction manager will use the context manager
     * to create plugin contexts instead of manual construction.
     */
    setContextManager(contextManager: PluginContextManager | null): void {
        this.contextManager = contextManager;
    }

    register(
        plugin: PluginDefinition<CanvasStore>,
        isPluginEnabled: (id: string) => boolean,
        getPluginApi: (id: string) => Record<string, (...args: unknown[]) => unknown> | undefined
    ): void {
        this.bindPluginInteractions(plugin, isPluginEnabled, getPluginApi);
        this.bindPluginShortcuts(plugin, isPluginEnabled);
    }

    unregister(pluginId: string): void {
        this.teardownPluginInteractions(pluginId);
        this.teardownPluginShortcuts(pluginId);
    }

    // --- Interaction Bindings ---

    private addInteractionSubscription(pluginId: string, unsubscribe: () => void): void {
        if (!this.interactionSubscriptions.has(pluginId)) {
            this.interactionSubscriptions.set(pluginId, new Set());
        }
        this.interactionSubscriptions.get(pluginId)!.add(unsubscribe);
    }

    private removeInteractionSubscription(pluginId: string, unsubscribe: () => void): void {
        const subscriptions = this.interactionSubscriptions.get(pluginId);
        if (!subscriptions) return;
        subscriptions.delete(unsubscribe);
        if (subscriptions.size === 0) {
            this.interactionSubscriptions.delete(pluginId);
        }
    }

    // Exposed for PluginManager to register ad-hoc interaction handlers if needed
    registerInteractionHandler<K extends keyof CanvasEventMap>(
        pluginId: string,
        eventType: K,
        handler: (payload: CanvasEventMap[K]) => void
    ): () => void {
        if (!this.eventBus) {
            throw new Error('Canvas event bus is not available. Ensure the canvas is mounted before registering handlers.');
        }

        const wrappedHandler = (payload: CanvasEventMap[K]) => {
            const hasActivePlugin = 'activePlugin' in payload;
            if (hasActivePlugin && (payload as { activePlugin: string | null }).activePlugin !== pluginId) {
                return;
            }
            handler(payload);
        };

        const unsubscribe = this.eventBus.subscribe(eventType, wrappedHandler);
        this.addInteractionSubscription(pluginId, unsubscribe);

        return () => {
            unsubscribe();
            this.removeInteractionSubscription(pluginId, unsubscribe);
        };
    }

    refreshInteractions(
        plugins: PluginDefinition<CanvasStore>[],
        isPluginEnabled: (id: string) => boolean,
        getPluginApi: (id: string) => Record<string, (...args: unknown[]) => unknown> | undefined
    ) {
        // Re-bind all if event bus changes
        if (this.eventBus) {
            plugins.forEach(p => this.bindPluginInteractions(p, isPluginEnabled, getPluginApi));
        }
    }

    teardownAllInteractions() {
        Array.from(this.interactionSubscriptions.keys()).forEach(id => this.teardownPluginInteractions(id));
    }

    private teardownPluginInteractions(pluginId: string): void {
        const subscriptions = this.interactionSubscriptions.get(pluginId);
        if (subscriptions) {
            subscriptions.forEach((unsubscribe) => unsubscribe());
            this.interactionSubscriptions.delete(pluginId);
        }
    }

    /**
     * Create a plugin context using the context manager or fallback.
     * This provides a unified way to create contexts across all interaction handlers.
     */
    private createPluginContext(
        pluginId: string,
        _api: Record<string, (...args: unknown[]) => unknown>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        helpers: Record<string, (...args: any[]) => any>,
        pointerState?: Record<string, unknown>
    ): PluginContextFull<CanvasStore> {
        if (this.contextManager) {
            const context = this.contextManager.createHandlerContext(pluginId);
            // Override with specific helpers and pointerState if provided
            if (Object.keys(helpers).length > 0) {
                context.helpers = helpers;
            }
            if (pointerState) {
                context.pointerState = pointerState as CanvasPointerEventState;
            }
            return context;
        }

        // This shouldn't happen in normal operation
        throw new Error(
            `PluginInteractionManager: No context manager available for plugin "${pluginId}". ` +
            'Ensure the plugin system is properly initialized before dispatching events.'
        );
    }

    private bindPluginInteractions(
        plugin: PluginDefinition<CanvasStore>,
        isPluginEnabled: (id: string) => boolean,
        getPluginApi: (id: string) => Record<string, (...args: unknown[]) => unknown> | undefined
    ): void {
        if (!this.eventBus) return;

        this.teardownPluginInteractions(plugin.id);

        if (plugin.handler) {
            const handler = plugin.handler;
            const eventsToSubscribe = plugin.subscribedEvents ?? ['pointerdown'];

            eventsToSubscribe.forEach((eventType) => {
                const unsubscribe = this.eventBus!.subscribe(eventType, (payload: CanvasPointerEventPayload) => {
                    if (payload.activePlugin !== plugin.id) return;
                    if (!isPluginEnabled(plugin.id)) return;

                    const target = payload.target as Element | null;
                    if (!target) return;

                    const api = getPluginApi(plugin.id) ?? {};
                    const context = this.createPluginContext(
                        plugin.id,
                        api,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        payload.helpers as Record<string, (...args: any[]) => any>,
                        payload.state as Record<string, unknown>
                    );

                    handler(
                        payload.event as React.PointerEvent,
                        payload.point,
                        target,
                        context
                    );
                });

                this.addInteractionSubscription(plugin.id, unsubscribe);
            });
        }

        // Double Click Handlers
        if (plugin.onElementDoubleClick) {
            const handler = plugin.onElementDoubleClick;
            const unsubscribe = this.eventBus!.subscribe('elementDoubleClick', (payload: CanvasElementDoubleClickEventPayload) => {
                if (payload.activePlugin !== plugin.id) return;

                const api = getPluginApi(plugin.id) ?? {};
                const context = this.createPluginContext(plugin.id, api, {});

                handler(payload.elementId, payload.event, context);
            });
            this.addInteractionSubscription(plugin.id, unsubscribe);
        }

        if (plugin.onSubpathDoubleClick) {
            const handler = plugin.onSubpathDoubleClick;
            const unsubscribe = this.eventBus!.subscribe('subpathDoubleClick', (payload: CanvasSubpathDoubleClickEventPayload) => {
                if (payload.activePlugin !== plugin.id) return;

                const api = getPluginApi(plugin.id) ?? {};
                const context = this.createPluginContext(plugin.id, api, {});

                handler(payload.elementId, payload.subpathIndex, payload.event, context);
            });
            this.addInteractionSubscription(plugin.id, unsubscribe);
        }

        if (plugin.onCanvasDoubleClick) {
            const handler = plugin.onCanvasDoubleClick;
            const unsubscribe = this.eventBus!.subscribe('canvasDoubleClick', (payload: CanvasDoubleClickEventPayload) => {
                if (payload.activePlugin !== plugin.id) return;

                const api = getPluginApi(plugin.id) ?? {};
                const context = this.createPluginContext(plugin.id, api, {});

                handler(payload.event, context);
            });
            this.addInteractionSubscription(plugin.id, unsubscribe);
        }
    }

    // --- Shortcut Bindings ---

    private bindPluginShortcuts(
        plugin: PluginDefinition<CanvasStore>,
        isPluginEnabled: (id: string) => boolean
    ): void {
        const shortcuts = plugin.keyboardShortcuts;
        if (!shortcuts) return;

        this.teardownPluginShortcuts(plugin.id);

        const scopedShortcuts: CanvasShortcutMap = {};
        const shortcutScope = plugin.keyboardShortcutScope ?? 'activePlugin';
        const shouldScopeToActivePlugin = shortcutScope === 'activePlugin';

        for (const [combination, definition] of Object.entries(shortcuts)) {
            const normalized = this.normalizeShortcutDefinition(definition);
            const existingWhen = normalized.options?.when;

            const when: CanvasShortcutOptions['when'] = (context, event) => {
                if (!isPluginEnabled(plugin.id)) return false;

                if (shouldScopeToActivePlugin) {
                    const state = context.store.getState() as { activePlugin?: string };
                    if (state?.activePlugin !== plugin.id) return false;
                }

                return existingWhen ? existingWhen(context, event) : true;
            };

            scopedShortcuts[combination] = {
                handler: normalized.handler,
                options: {
                    ...normalized.options,
                    when,
                },
            };
        }

        if (Object.keys(scopedShortcuts).length === 0) return;

        const unsubscribe = canvasShortcutRegistry.register(`plugin:${plugin.id}`, scopedShortcuts);
        this.shortcutSubscriptions.set(plugin.id, unsubscribe);
    }

    private teardownPluginShortcuts(pluginId: string): void {
        const unsubscribe = this.shortcutSubscriptions.get(pluginId);
        if (unsubscribe) {
            unsubscribe();
            this.shortcutSubscriptions.delete(pluginId);
        }
    }

    private normalizeShortcutDefinition(definition: CanvasShortcutMap[string]): CanvasShortcutDefinition {
        if (typeof definition === 'function') {
            return { handler: definition };
        }
        return definition;
    }

    // --- Drag Modifiers ---

    registerDragModifier(modifier: DragModifier): () => void {
        this.dragModifiers.set(modifier.id, modifier);
        return () => {
            this.dragModifiers.delete(modifier.id);
        };
    }

    getDragModifiers(): DragModifier[] {
        return Array.from(this.dragModifiers.values()).sort((a, b) => a.priority - b.priority);
    }

    registerElementDragModifier(modifier: ElementDragModifier): () => void {
        this.elementDragModifiers.set(modifier.id, modifier);
        return () => {
            this.elementDragModifiers.delete(modifier.id);
        };
    }

    getElementDragModifiers(): ElementDragModifier[] {
        return Array.from(this.elementDragModifiers.values()).sort((a, b) => a.priority - b.priority);
    }
}
