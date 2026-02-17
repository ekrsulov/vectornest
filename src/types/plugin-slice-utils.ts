export type SimplePluginSlice<
  TKey extends string,
  TState extends Record<string, unknown>
> = {
  [K in TKey]: TState;
} & {
  [K in `update${Capitalize<TKey>}State`]: (state: Partial<TState>) => void;
};

export type PluginSetFn<TSlice> = (
  partial: TSlice | Partial<TSlice> | ((state: TSlice) => TSlice | Partial<TSlice>),
  replace?: boolean
) => void;

export type PluginGetFn<TSlice> = () => TSlice;

export type PluginApi<TSlice> = {
  setState: PluginSetFn<TSlice>;
  getState: PluginGetFn<TSlice>;
  subscribe: (listener: (state: TSlice, previousState: TSlice) => void) => () => void;
  destroy?: () => void;
};
