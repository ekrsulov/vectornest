import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import {
  CanvasControllerActionsContext,
  CanvasControllerContext,
  CanvasControllerDataContext,
  splitCanvasControllerValue,
  useCanvasControllerActionsSource,
  useCanvasControllerDataSource,
  type CanvasControllerActions,
  type CanvasControllerData,
  type CanvasControllerValue,
} from './CanvasControllerContext';

type CanvasControllerProviderProps = PropsWithChildren<{
  value?: CanvasControllerValue;
}>;

export const CanvasControllerProvider = ({ value, children }: CanvasControllerProviderProps) => {
  const defaultData = useCanvasControllerDataSource();
  const defaultActions = useCanvasControllerActionsSource();

  const { data: providedData, actions: providedActions } = useMemo(
    () =>
      value
        ? splitCanvasControllerValue(value)
        : { data: null, actions: null },
    [value]
  );

  const dataValue: CanvasControllerData = providedData ?? defaultData;
  const actionsValue: CanvasControllerActions = providedActions ?? defaultActions;
  const contextValue: CanvasControllerValue = useMemo(
    () => ({
      ...dataValue,
      ...actionsValue,
    }),
    [dataValue, actionsValue]
  );

  return (
    <CanvasControllerDataContext.Provider value={dataValue}>
      <CanvasControllerActionsContext.Provider value={actionsValue}>
        <CanvasControllerContext.Provider value={contextValue}>
          {children}
        </CanvasControllerContext.Provider>
      </CanvasControllerActionsContext.Provider>
    </CanvasControllerDataContext.Provider>
  );
};
