import type { ShortcutInterceptor } from '../../types/extensionPoints';

const interceptors: ShortcutInterceptor[] = [];

export const registerShortcutInterceptor = (interceptor: ShortcutInterceptor): void => {
  const existing = interceptors.findIndex((i) => i.pluginId === interceptor.pluginId);
  if (existing >= 0) {
    interceptors[existing] = interceptor;
    return;
  }
  interceptors.push(interceptor);
};

export const unregisterShortcutInterceptor = (pluginId: string): void => {
  const idx = interceptors.findIndex((i) => i.pluginId === pluginId);
  if (idx >= 0) {
    interceptors.splice(idx, 1);
  }
};

export const getInterceptorsForShortcut = (shortcut: string): ShortcutInterceptor[] => {
  return interceptors
    .filter((i) => i.shortcuts.includes(shortcut))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
};
