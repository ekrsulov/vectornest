
export interface GridLayoutState {
    currentXOffset: number;
    currentYOffset: number;
    currentRowMaxHeight: number;
    margin: number;
    maxRowWidth: number;
}

export const INITIAL_GRID_LAYOUT: GridLayoutState = {
    currentXOffset: 0,
    currentYOffset: 0,
    currentRowMaxHeight: 0,
    margin: 160,
    maxRowWidth: 12288
};

type GridLayoutOptions = { skipPadding?: boolean };

export const updateGridLayout = (
    state: GridLayoutState,
    width: number,
    height: number,
    options: GridLayoutOptions = {}
): { newState: GridLayoutState; position: { x: number; y: number } } => {
    let { currentXOffset, currentYOffset, currentRowMaxHeight } = state;
    const { margin, maxRowWidth } = state;
    const effectiveMargin = options.skipPadding ? 0 : margin;

    if (currentXOffset > 0 && currentXOffset + width > maxRowWidth) {
        currentXOffset = 0;
        currentYOffset += currentRowMaxHeight + effectiveMargin;
        currentRowMaxHeight = 0;
    }

    const position = {
        x: currentXOffset,
        y: currentYOffset
    };

    const newState = {
        ...state,
        currentXOffset: currentXOffset + width + effectiveMargin,
        currentYOffset,
        currentRowMaxHeight: Math.max(currentRowMaxHeight, height)
    };

    return { newState, position };
};
