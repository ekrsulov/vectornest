import type { Point } from '../../types';

/**
 * Selection strategy for determining which items fall within a selection area.
 * Plugins can implement this to provide custom selection behaviors (e.g., lasso, rectangle, etc.)
 */
export interface SelectionStrategy {
  /**
   * Unique identifier for this selection strategy
   */
  id: string;

  /**
   * Check if a point is within the selection area
   */
  containsPoint: (point: Point, selectionData: SelectionData) => boolean;

  /**
   * Check if bounds intersect with the selection area
   */
  intersectsBounds: (
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    selectionData: SelectionData
  ) => boolean;
}

/**
 * Data representing the current selection area
 */
export interface SelectionData {
  /**
   * Starting point of the selection
   */
  start: Point;

  /**
   * Current/ending point of the selection
   */
  end: Point;

  /**
   * Optional path data for free-form selections (e.g., lasso)
   */
  path?: Point[];

  /**
   * Whether the lasso selection is closed (forms a polygon) or open (line selection)
   */
  closed?: boolean;
}

/**
 * Default rectangle selection strategy
 */
export class RectangleSelectionStrategy implements SelectionStrategy {
  id = 'rectangle';

  containsPoint(point: Point, selectionData: SelectionData): boolean {
    const minX = Math.min(selectionData.start.x, selectionData.end.x);
    const maxX = Math.max(selectionData.start.x, selectionData.end.x);
    const minY = Math.min(selectionData.start.y, selectionData.end.y);
    const maxY = Math.max(selectionData.start.y, selectionData.end.y);

    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }

  intersectsBounds(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    selectionData: SelectionData
  ): boolean {
    const minX = Math.min(selectionData.start.x, selectionData.end.x);
    const maxX = Math.max(selectionData.start.x, selectionData.end.x);
    const minY = Math.min(selectionData.start.y, selectionData.end.y);
    const maxY = Math.max(selectionData.start.y, selectionData.end.y);

    return !(bounds.maxX < minX || bounds.minX > maxX || bounds.maxY < minY || bounds.minY > maxY);
  }
}

/**
 * Registry for selection strategies
 */
class SelectionStrategyRegistry {
  private strategies = new Map<string, SelectionStrategy>();
  private defaultStrategy: SelectionStrategy = new RectangleSelectionStrategy();

  constructor() {
    // Register default strategy
    this.register(this.defaultStrategy);
  }

  register(strategy: SelectionStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  unregister(strategyId: string): void {
    this.strategies.delete(strategyId);
  }

  get(strategyId: string): SelectionStrategy {
    return this.strategies.get(strategyId) ?? this.defaultStrategy;
  }

  getDefault(): SelectionStrategy {
    return this.defaultStrategy;
  }
}

export const selectionStrategyRegistry = new SelectionStrategyRegistry();
