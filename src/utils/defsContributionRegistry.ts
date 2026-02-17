import React from 'react';
import type { CanvasElement } from '../types';
import type { CanvasStore } from '../store/canvasStore';
import { ContributionRegistry } from './ContributionRegistry';

/**
 * DefContribution interface for registering SVG <defs> contributions.
 * 
 * This registry is used for CANVAS RENDERING and SVG EXPORT.
 * Contributions render their definitions (patterns, gradients, masks, etc.)
 * directly in the main canvas SVG element.
 * 
 * - collectUsedIds: Scans canvas elements to find which defs are actually used
 * - renderDefs: Renders React elements for the canvas <defs> section (with animations)
 * - serializeDefs: Generates SVG markup for export
 * 
 * Note: This is different from paintContributionRegistry which is used for UI
 * (paint pickers, swatches, etc.)
 */
export interface DefContribution {
  id: string;
  collectUsedIds?: (elements: CanvasElement[]) => Set<string>;
  renderDefs: (state: CanvasStore, usedIds: Set<string>) => React.ReactNode;
  serializeDefs: (state: CanvasStore, usedIds: Set<string>) => string[];
}

type UsageMap = Map<string, Set<string>>;

const URL_REGEX = /url\(#([^)]+)\)/i;

const collectArtboardBackgroundPaintId = (state?: CanvasStore): string | null => {
  if (!state) return null;

  const artboardState = state as unknown as {
    artboard?: {
      enabled?: boolean;
      backgroundColor?: string;
    };
  };

  const backgroundColor = artboardState.artboard?.backgroundColor;
  if (!artboardState.artboard?.enabled || !backgroundColor || backgroundColor === 'none') {
    return null;
  }

  const match = backgroundColor.match(URL_REGEX);
  return match ? match[1] : null;
};

class DefsContributionRegistry extends ContributionRegistry<DefContribution> {

  private collectUsage(elements: CanvasElement[], state?: CanvasStore): UsageMap {
    const usage: UsageMap = new Map();
    this.contributions.forEach((c) => {
      usage.set(c.id, c.collectUsedIds ? c.collectUsedIds(elements) : new Set<string>());
    });

    const artboardPaintId = collectArtboardBackgroundPaintId(state);
    if (artboardPaintId) {
      const gradientUsage = usage.get('gradients');
      gradientUsage?.add(artboardPaintId);
      const patternUsage = usage.get('patterns');
      patternUsage?.add(artboardPaintId);
    }

    return usage;
  }

  renderDefs(state: CanvasStore, elements?: CanvasElement[]): React.ReactNode {
    const usage = this.collectUsage(elements ?? state.elements ?? [], state);
    return this.contributions.map((c) =>
      React.createElement(React.Fragment, { key: c.id }, c.renderDefs(state, usage.get(c.id) ?? new Set<string>()))
    );
  }

  serializeDefs(state: CanvasStore, elements?: CanvasElement[]): string {
    const usage = this.collectUsage(elements ?? state.elements ?? [], state);
    const parts = this.contributions.flatMap((c) => c.serializeDefs(state, usage.get(c.id) ?? new Set<string>()));
    if (!parts.length) return '';
    return `<defs>\n${parts.join('\n')}\n</defs>`;
  }
}

export const defsContributionRegistry = new DefsContributionRegistry();
