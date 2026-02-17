export interface ArrangeSlice {
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  distributeHorizontally: () => void;
  distributeVertically: () => void;
  matchWidthToLargest: () => void;
  matchHeightToLargest: () => void;
  matchWidthToSmallest: () => void;
  matchHeightToSmallest: () => void;
}
