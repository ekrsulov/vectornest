import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export interface ComplianceIssue {
  elementId: string;
  type: 'off-grid-x' | 'off-grid-y' | 'off-grid-width' | 'off-grid-height';
  actual: number;
  nearest: number;
  offset: number;
  description: string;
}

export interface GridComplianceState extends Record<string, unknown> {
  enabled: boolean;
  gridSize: number;
  tolerance: number;
  checkPositions: boolean;
  checkDimensions: boolean;
  issues: ComplianceIssue[];
  compliancePercent: number;
  totalChecks: number;
  passedChecks: number;
}

export interface GridCompliancePluginSlice {
  gridCompliance: GridComplianceState;
  updateGridComplianceState: (state: Partial<GridComplianceState>) => void;
}

export const createGridComplianceSlice: StateCreator<
  GridCompliancePluginSlice,
  [],
  [],
  GridCompliancePluginSlice
> = createSimplePluginSlice<'gridCompliance', GridComplianceState, GridCompliancePluginSlice>(
  'gridCompliance',
  {
    enabled: false,
    gridSize: 8,
    tolerance: 0.5,
    checkPositions: true,
    checkDimensions: true,
    issues: [],
    compliancePercent: 100,
    totalChecks: 0,
    passedChecks: 0,
  }
);
