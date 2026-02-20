import type { PluginDefinition } from '../../types/plugins';
import type { CanvasStore } from '../../store/canvasStore';
import { ShieldCheck } from 'lucide-react';
import { createPluginSlice } from '../../utils/pluginUtils';
import { createAccessibilityCheckerSlice } from './slice';
import { AccessibilityCheckerPanel } from './AccessibilityCheckerPanel';
import { registerStateKeys } from '../../store/persistenceRegistry';

registerStateKeys('accessibilityChecker', ['accessibilityChecker'], 'temporal');

export const accessibilityCheckerPlugin: PluginDefinition<CanvasStore> = {
  id: 'accessibilityChecker',
  metadata: {
    label: 'Accessibility Checker',
    icon: ShieldCheck,
    cursor: 'default',
  },
  slices: [createPluginSlice(createAccessibilityCheckerSlice)],
  relatedPluginPanels: [
    {
      id: 'accessibility-checker',
      targetPlugin: 'auditLibrary',
      component: AccessibilityCheckerPanel,
      order: 80,
    },
  ],
};

export type { AccessibilityCheckerPluginSlice } from './slice';
