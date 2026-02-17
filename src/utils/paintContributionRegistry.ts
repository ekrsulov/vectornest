import React from 'react';
import type { CanvasStore } from '../store/canvasStore';
import { ContributionRegistry } from './ContributionRegistry';

export type PaintPickerProps = {
  currentValue: string;
  onSelect: (value: string) => void;
  mode: 'fill' | 'stroke';
};

/**
 * PaintContribution interface for registering paint type contributions.
 * 
 * This registry is used for UI COMPONENTS (paint picker, swatches, sidebar).
 * Contributions provide UI for selecting and previewing paint types.
 * 
 * - renderPicker: Renders the paint picker component in the sidebar
 * - renderDefs: Renders defs for UI previews (swatches, picker thumbnails)
 * - serializeDefs: Generates SVG markup for UI preview serialization
 * 
 * Note: This is different from defsContributionRegistry which is used for
 * actual canvas rendering and SVG export.
 */
export interface PaintContribution {
  id: string;
  label: string;
  showInPicker?: boolean;
  renderPicker: (props: PaintPickerProps) => React.ReactNode;
  renderDefs: () => React.ReactNode;
  serializeDefs: (state: CanvasStore, usedPaintIds: Set<string>) => string[];
}

class PaintContributionRegistry extends ContributionRegistry<PaintContribution> {

  renderDefs(): React.ReactNode {
    return this.contributions.map((c) =>
      // Avoid JSX to keep this file as .ts
      React.createElement(React.Fragment, { key: c.id }, c.renderDefs())
    );
  }

  serializeDefs(state: CanvasStore, usedPaintIds: Set<string>): string {
    const parts = this.contributions.flatMap((c) => c.serializeDefs(state, usedPaintIds));
    if (!parts.length) return '';
    return `<defs>\n${parts.join('\n')}\n</defs>`;
  }
}

export const paintContributionRegistry = new PaintContributionRegistry();
