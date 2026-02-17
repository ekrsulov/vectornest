import type { DragPointInfo } from '../types/extensionPoints';

type DragPointCarrier = {
  dragPointInfo?: DragPointInfo | null;
} | null | undefined;

/**
 * Safely extracts DragPointInfo from a carrier object (DragContext, etc.).
 * Prefer importing from here rather than from types/extensionPoints.ts.
 */
export const getDragPointInfo = (ctx?: DragPointCarrier): DragPointInfo | null => {
  if (!ctx) return null;
  return ctx.dragPointInfo ?? null;
};
