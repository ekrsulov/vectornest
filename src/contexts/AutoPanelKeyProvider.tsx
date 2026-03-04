import { useMemo, type ReactNode } from 'react';
import { AutoPanelKeyContext } from './autoPanelKeyContext';

export function AutoPanelKeyProvider({
  namespace,
  children,
}: {
  namespace: string | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      namespace,
      depth: 0,
    }),
    [namespace]
  );

  return (
    <AutoPanelKeyContext.Provider value={value}>
      {children}
    </AutoPanelKeyContext.Provider>
  );
}
