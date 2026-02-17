/**
 * Utility function to get effective shift state without a hook
 * Useful in event handlers or callbacks where hooks can't be used
 * 
 * @param physicalShiftKey - The state of the physical shift key (from keyboard event)
 * @param isVirtualShiftActive - The virtual shift state from store
 * @returns The effective shift state (physical OR virtual)
 */
export const getEffectiveShift = (
  physicalShiftKey: boolean,
  isVirtualShiftActive: boolean
): boolean => {
  return physicalShiftKey || isVirtualShiftActive;
};



