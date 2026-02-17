import type { AppSettings, CanvasElement, CanvasElementInput } from '../../../types';

export interface BaseSlice {
  // State
  elements: CanvasElement[];
  activePlugin: string | null;
  documentName: string;
  isVirtualShiftActive: boolean;
  lastUsedToolByGroup: Record<string, string>;
  isPathInteractionDisabled: boolean;
  pathCursorMode: 'select' | 'default' | 'pointer';
  settings: AppSettings;

  // Actions
  addElement: (element: CanvasElementInput, explicitZIndex?: number) => string;
  updateElement: (id: string, updates: Omit<Partial<CanvasElement>, 'data'> & { data?: unknown }) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  setActivePlugin: (plugin: string | null) => void;
  setMode: (mode: string) => void;
  setDocumentName: (name: string) => void;
  setVirtualShift: (active: boolean) => void;
  updateLastUsedTool: (group: string, toolId: string) => void;
  toggleVirtualShift: () => void;
  setPathInteractionDisabled: (disabled: boolean) => void;
  setPathCursorMode: (mode: 'select' | 'default' | 'pointer') => void;
  updateSettings: (updates: Partial<BaseSlice['settings']>) => void;
  saveDocument: () => void;
  loadDocument: (append?: boolean) => Promise<void>;
  saveAsSvg: (selectedOnly?: boolean) => void;
  saveAsPng: (selectedOnly?: boolean) => void;
}
