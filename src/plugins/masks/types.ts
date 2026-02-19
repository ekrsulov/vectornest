export interface MaskDefinition {
  id: string;
  name?: string;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
  maskUnits?: string;
  maskContentUnits?: string;
  content: string;
  /** If mask comes from a preset, keep its id so it can be regenerated to fit selection */
  presetId?: string;
  /** Offset in X for translating mask content when elements using the mask move */
  originX?: number;
  /** Offset in Y for translating mask content when elements using the mask move */
  originY?: number;
  /** Version counter to force browser re-render when mask content/position changes */
  version?: number;
}

export interface MasksSlice {
  masks: MaskDefinition[];
  importedMasks?: MaskDefinition[];
  createMaskFromSelection?: () => void;
  assignMaskToSelection?: (maskId: string) => void;
  clearMaskFromSelection?: () => void;
  removeMask?: (maskId: string) => void;
  updateMask?: (maskId: string, updates: Partial<MaskDefinition>) => void;
  renameMask?: (maskId: string, name: string) => void;
  selectedFromSearch?: string | null;
  selectFromSearch?: (id: string | null) => void;
}
