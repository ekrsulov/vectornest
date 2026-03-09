import { describe, expect, it, vi } from 'vitest';

import type { CanvasStore } from '../../store/canvasStore';
import { measureCommandsBounds } from '../../utils/measurementUtils';
import { createSymbolsSlice, type SymbolPluginSlice } from './slice';

const createTestStore = () => {
  let state: Partial<CanvasStore & SymbolPluginSlice> = {
    style: {
      strokeColor: '#000000',
      strokeWidth: 2,
      strokeOpacity: 1,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeDasharray: '',
      fillColor: '#ff0000',
      fillOpacity: 1,
      fillRule: 'nonzero',
    } as CanvasStore['style'],
    elements: [],
    selectedIds: [],
    addElement: vi.fn(),
  };

  const set = (
    updater:
      | Partial<CanvasStore & SymbolPluginSlice>
      | ((current: Partial<CanvasStore & SymbolPluginSlice>) => Partial<CanvasStore & SymbolPluginSlice>)
  ) => {
    const partial = typeof updater === 'function' ? updater(state) : updater;
    state = {
      ...state,
      ...partial,
    };
  };

  const get = () => state as CanvasStore & SymbolPluginSlice;
  state = {
    ...state,
    ...createSymbolsSlice(set as never, get as never, {} as never),
  };

  return {
    getState: get,
    setState: (partial: Partial<CanvasStore & SymbolPluginSlice>) => {
      state = {
        ...state,
        ...partial,
      };
    },
  };
};

describe('symbols slice placement', () => {
  it('scales simple symbol pathData to the drag rect', () => {
    const store = createTestStore();
    store.setState({
      symbols: [
        {
          id: 'symbol-1',
          name: 'Square',
          bounds: {
            minX: 0,
            minY: 0,
            width: 20,
            height: 20,
          },
          pathData: {
            subPaths: [[
              { type: 'M', position: { x: 0, y: 0 } },
              { type: 'L', position: { x: 20, y: 0 } },
              { type: 'L', position: { x: 20, y: 20 } },
              { type: 'L', position: { x: 0, y: 20 } },
              { type: 'Z' },
            ]],
            strokeColor: '#000000',
            strokeWidth: 1,
            strokeOpacity: 1,
            fillColor: '#000000',
            fillOpacity: 1,
          },
        },
      ],
    });

    store.getState().placeSymbolInstanceAtRect('symbol-1', {
      x: 50,
      y: 70,
      width: 120,
      height: 120,
    });

    const addElement = store.getState().addElement as ReturnType<typeof vi.fn>;
    expect(addElement).toHaveBeenCalledTimes(1);

    const payload = addElement.mock.calls[0]?.[0];
    expect(payload?.type).toBe('symbolInstance');
    expect(payload?.data.width).toBe(120);
    expect(payload?.data.height).toBe(120);
    expect(payload?.data.pathData).toBeTruthy();

    const bounds = measureCommandsBounds(payload.data.pathData.subPaths[0]);
    expect(bounds?.minX).toBeCloseTo(0, 3);
    expect(bounds?.minY).toBeCloseTo(0, 3);
    expect((bounds?.maxX ?? 0) - (bounds?.minX ?? 0)).toBeCloseTo(120, 3);
    expect((bounds?.maxY ?? 0) - (bounds?.minY ?? 0)).toBeCloseTo(120, 3);
  });
});
