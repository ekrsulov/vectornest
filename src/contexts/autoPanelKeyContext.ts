import { createContext, useContext } from 'react';

export interface AutoPanelKeyContextValue {
  namespace: string | null;
  depth: number;
}

export const DEFAULT_AUTO_PANEL_KEY_CONTEXT: AutoPanelKeyContextValue = {
  namespace: null,
  depth: 0,
};

export const AutoPanelKeyContext = createContext<AutoPanelKeyContextValue>(
  DEFAULT_AUTO_PANEL_KEY_CONTEXT
);

export function useAutoPanelKeyContext() {
  return useContext(AutoPanelKeyContext);
}
