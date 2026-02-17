import { type ReactNode } from 'react';
import { SidebarPanelScopeContext, type SidebarPanelScope } from './sidebarPanelState';

export function SidebarPanelScopeProvider({
  scope,
  children,
}: {
  scope: SidebarPanelScope;
  children: ReactNode;
}) {
  return (
    <SidebarPanelScopeContext.Provider value={scope}>
      {children}
    </SidebarPanelScopeContext.Provider>
  );
}

