import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export type A11ySeverity = 'pass' | 'warning' | 'fail';

export interface A11yIssue {
  elementId: string;
  type: 'touch-target' | 'min-size' | 'adjacent-contrast' | 'thin-stroke' | 'tiny-element';
  severity: A11ySeverity;
  value: number;
  threshold: number;
  description: string;
  suggestion: string;
}

export interface AccessibilityCheckerState extends Record<string, unknown> {
  minTouchTarget: number;
  minElementSize: number;
  minStrokeWidth: number;
  checkTouchTargets: boolean;
  checkMinSize: boolean;
  checkThinStrokes: boolean;
  checkTinyElements: boolean;
  issues: A11yIssue[];
  passCount: number;
  failCount: number;
  warningCount: number;
}

export interface AccessibilityCheckerPluginSlice {
  accessibilityChecker: AccessibilityCheckerState;
  updateAccessibilityCheckerState: (state: Partial<AccessibilityCheckerState>) => void;
}

export const createAccessibilityCheckerSlice: StateCreator<
  AccessibilityCheckerPluginSlice,
  [],
  [],
  AccessibilityCheckerPluginSlice
> = createSimplePluginSlice<'accessibilityChecker', AccessibilityCheckerState, AccessibilityCheckerPluginSlice>(
  'accessibilityChecker',
  {
    minTouchTarget: 44,
    minElementSize: 8,
    minStrokeWidth: 1,
    checkTouchTargets: true,
    checkMinSize: true,
    checkThinStrokes: true,
    checkTinyElements: true,
    issues: [],
    passCount: 0,
    failCount: 0,
    warningCount: 0,
  }
);
