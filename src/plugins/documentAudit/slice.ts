import type { StateCreator } from 'zustand';
import { createSimplePluginSlice } from '../../utils/pluginSliceHelpers';

export type IssueSeverity = 'error' | 'warning' | 'info';
export type IssueCategory =
  | 'empty-group'
  | 'zero-size'
  | 'invisible'
  | 'out-of-bounds'
  | 'excessive-complexity'
  | 'missing-style'
  | 'redundant'
  | 'unreachable';

export interface AuditIssue {
  elementId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  suggestion: string;
}

export interface AuditSummary {
  totalElements: number;
  pathCount: number;
  groupCount: number;
  otherCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface DocumentAuditState extends Record<string, unknown> {
  issues: AuditIssue[];
  summary: AuditSummary | null;
  checkEmptyGroups: boolean;
  checkZeroSize: boolean;
  checkInvisible: boolean;
  checkOutOfBounds: boolean;
  checkComplexity: boolean;
  checkMissingStyle: boolean;
  complexityThreshold: number;
  boundsLimit: number;
}

export interface DocumentAuditPluginSlice {
  documentAudit: DocumentAuditState;
  updateDocumentAuditState: (state: Partial<DocumentAuditState>) => void;
}

export const createDocumentAuditSlice: StateCreator<
  DocumentAuditPluginSlice,
  [],
  [],
  DocumentAuditPluginSlice
> = createSimplePluginSlice<'documentAudit', DocumentAuditState, DocumentAuditPluginSlice>(
  'documentAudit',
  {
    issues: [],
    summary: null,
    checkEmptyGroups: true,
    checkZeroSize: true,
    checkInvisible: true,
    checkOutOfBounds: true,
    checkComplexity: true,
    checkMissingStyle: true,
    complexityThreshold: 500,
    boundsLimit: 5000,
  }
);
