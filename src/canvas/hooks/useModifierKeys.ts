import { useEffect, useCallback, useMemo, useReducer } from 'react';
import { installGlobalPluginListeners, createListenerContext } from '../../utils/pluginListeners';
import { useCanvasStore } from '../../store/canvasStore';
import { SHIFT_KEYS, CTRL_KEYS, META_KEYS, ALT_KEYS, isModifierKey } from '../../utils/keyboardConstants';

export interface ModifierKeysState {
  isShiftPressed: boolean;
  isCtrlPressed: boolean;
  isMetaPressed: boolean;
  isAltPressed: boolean;
  /** True if shift OR ctrl/meta is pressed (for multi-select) */
  isMultiSelectActive: boolean;
}

interface ModifierAction {
  type: 'SET_SHIFT' | 'SET_CTRL' | 'SET_META' | 'SET_ALT' | 'RESET_ALL';
  value?: boolean;
}

const modifierReducer = (state: ModifierKeysState, action: ModifierAction): ModifierKeysState => {
  switch (action.type) {
    case 'SET_SHIFT': {
      if (state.isShiftPressed === action.value) return state;
      const isShiftPressed = action.value!;
      return { ...state, isShiftPressed, isMultiSelectActive: isShiftPressed || state.isCtrlPressed || state.isMetaPressed };
    }
    case 'SET_CTRL': {
      if (state.isCtrlPressed === action.value) return state;
      const isCtrlPressed = action.value!;
      return { ...state, isCtrlPressed, isMultiSelectActive: state.isShiftPressed || isCtrlPressed || state.isMetaPressed };
    }
    case 'SET_META': {
      if (state.isMetaPressed === action.value) return state;
      const isMetaPressed = action.value!;
      return { ...state, isMetaPressed, isMultiSelectActive: state.isShiftPressed || state.isCtrlPressed || isMetaPressed };
    }
    case 'SET_ALT': {
      if (state.isAltPressed === action.value) return state;
      return { ...state, isAltPressed: action.value! };
    }
    case 'RESET_ALL':
      if (!state.isShiftPressed && !state.isCtrlPressed && !state.isMetaPressed && !state.isAltPressed) return state;
      return { isShiftPressed: false, isCtrlPressed: false, isMetaPressed: false, isAltPressed: false, isMultiSelectActive: false };
    default:
      return state;
  }
};

const initialState: ModifierKeysState = {
  isShiftPressed: false,
  isCtrlPressed: false,
  isMetaPressed: false,
  isAltPressed: false,
  isMultiSelectActive: false,
};

/**
 * Consolidated hook for tracking keyboard modifier keys.
 * Uses useReducer to batch state updates and minimize re-renders.
 * 
 * @param virtualShiftActive - Optional external shift state (e.g., from touch UI)
 * @returns Current modifier keys state
 */
export function useModifierKeys(virtualShiftActive = false): ModifierKeysState {
  const [state, dispatch] = useReducer(modifierReducer, initialState);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isModifierKey(e, SHIFT_KEYS)) dispatch({ type: 'SET_SHIFT', value: true });
    if (isModifierKey(e, CTRL_KEYS)) dispatch({ type: 'SET_CTRL', value: true });
    if (isModifierKey(e, META_KEYS)) dispatch({ type: 'SET_META', value: true });
    if (isModifierKey(e, ALT_KEYS)) dispatch({ type: 'SET_ALT', value: true });
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (isModifierKey(e, SHIFT_KEYS)) dispatch({ type: 'SET_SHIFT', value: false });
    if (isModifierKey(e, CTRL_KEYS)) dispatch({ type: 'SET_CTRL', value: false });
    if (isModifierKey(e, META_KEYS)) dispatch({ type: 'SET_META', value: false });
    if (isModifierKey(e, ALT_KEYS)) dispatch({ type: 'SET_ALT', value: false });
  }, []);

  // Reset all modifiers when window loses focus
  const handleBlur = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  useEffect(() => {
    const cleanup = installGlobalPluginListeners(createListenerContext(useCanvasStore), [
      { target: () => window, event: 'keydown', handler: handleKeyDown },
      { target: () => window, event: 'keyup', handler: handleKeyUp },
      { target: () => window, event: 'blur', handler: () => handleBlur() },
    ]);

    return cleanup;
  }, [handleKeyDown, handleKeyUp, handleBlur]);

  // Combine physical shift with virtual shift
  const isShiftPressed = state.isShiftPressed || virtualShiftActive;
  const isMultiSelectActive = isShiftPressed || state.isCtrlPressed || state.isMetaPressed;

  return useMemo(() => ({
    isShiftPressed,
    isCtrlPressed: state.isCtrlPressed,
    isMetaPressed: state.isMetaPressed,
    isAltPressed: state.isAltPressed,
    isMultiSelectActive,
  }), [isShiftPressed, state.isCtrlPressed, state.isMetaPressed, state.isAltPressed, isMultiSelectActive]);
}
