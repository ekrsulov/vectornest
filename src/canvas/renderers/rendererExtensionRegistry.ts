import React from 'react';
import type { CanvasElement } from '../../types';
import type { CanvasRenderContext } from './CanvasRendererRegistry';
import type { RendererExtension } from '../../types/extensionPoints';

const extensions: RendererExtension[] = [];
let sortedExtensionsCache: RendererExtension[] | null = null;

const invalidateSortedExtensionsCache = (): void => {
  sortedExtensionsCache = null;
};

export const registerRendererExtension = (extension: RendererExtension): void => {
  const existingIndex = extensions.findIndex((ext) => ext.pluginId === extension.pluginId);
  if (existingIndex >= 0) {
    extensions[existingIndex] = extension;
    invalidateSortedExtensionsCache();
    return;
  }
  extensions.push(extension);
  invalidateSortedExtensionsCache();
};

export const unregisterRendererExtension = (pluginId: string): void => {
  const index = extensions.findIndex((ext) => ext.pluginId === pluginId);
  if (index >= 0) {
    extensions.splice(index, 1);
    invalidateSortedExtensionsCache();
  }
};

const getSortedExtensions = (): RendererExtension[] => {
  if (!sortedExtensionsCache) {
    sortedExtensionsCache = [...extensions].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
  }
  return sortedExtensionsCache;
};

export const collectExtensionAttributes = (
  element: CanvasElement,
  context: CanvasRenderContext
): Record<string, unknown> => {
  const attrs: Array<Record<string, unknown>> = [];
  getSortedExtensions().forEach((ext) => {
    if (ext.appliesTo && !ext.appliesTo(element, context)) return;
    if (ext.getElementAttributes) {
      const result = ext.getElementAttributes(element, context);
      if (result) attrs.push(result);
    }
  });
  return Object.assign({}, ...attrs);
};

export const collectExtensionChildren = (
  element: CanvasElement,
  context: CanvasRenderContext
): Array<React.ReactNode> => {
  const nodes: Array<React.ReactNode> = [];
  getSortedExtensions().forEach((ext) => {
    if (ext.appliesTo && !ext.appliesTo(element, context)) return;
    if (ext.getElementChildren) {
      const result = ext.getElementChildren(element, context);
      if (Array.isArray(result)) {
        nodes.push(...result);
      } else if (result !== null && result !== undefined) {
        nodes.push(result);
      }
    }
  });
  return nodes;
};
