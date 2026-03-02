import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { lazy } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createDocumentAuditSlice } from './slice';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('documentAudit', ['documentAudit'], 'temporal');
const DocumentAuditPanel = lazy(() =>
  import('./DocumentAuditPanel').then((module) => ({ default: module.DocumentAuditPanel }))
);

export const documentAuditPlugin: PluginDefinition<CanvasStore> = {
  id: 'documentAudit',
  metadata: {
    label: 'Document Audit',
    icon: ClipboardCheck,
    cursor: 'default',
  },
  slices: [createPluginSlice(createDocumentAuditSlice)],
  relatedPluginPanels: [
    {
      id: 'document-audit',
      targetPlugin: 'auditLibrary',
      component: DocumentAuditPanel,
      order: 70,
    },
  ],
};

export type { DocumentAuditPluginSlice } from './slice';
