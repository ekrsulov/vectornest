import { ShieldCheck } from 'lucide-react';
import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { createToolPanel } from '../../utils/pluginFactories';
import { AuditLibraryPanel } from './AuditLibraryPanel';

export const auditLibraryPlugin: PluginDefinition<CanvasStore> = {
  id: 'auditLibrary',
  metadata: {
    label: 'Audit Library',
    icon: ShieldCheck,
    cursor: 'default',
  },
  behaviorFlags: () => ({
    isSidebarPanelMode: true,
  }),
  sidebarToolbarButtons: [
    {
      id: 'audit-library-panel-toggle',
      icon: ShieldCheck,
      label: 'Audit',
      order: 2,
    },
  ],
  sidebarPanels: [createToolPanel('auditLibrary', AuditLibraryPanel)],
};
