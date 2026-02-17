import React from 'react';
import type { CanvasStore } from '../store/canvasStore';

export type SolidPaint = { kind: 'solid'; value: string; payload?: unknown };
export type CustomPaint<TPayload = unknown> = { kind: string; id: string; payload?: TPayload };
export type PaintInstance<TPayload = unknown> = SolidPaint | CustomPaint<TPayload>;

export interface PaintTypeHandler<TPayload = unknown> {
  kind: string;
  getPaintValue?: (paint: PaintInstance<TPayload>, options?: { idOverride?: string }) => string;
  ensureDefinition?: (paint: CustomPaint<TPayload>, store: CanvasStore) => void;
  renderSwatchDef?: (
    paint: CustomPaint<TPayload>,
    options: { localId: string; store: CanvasStore }
  ) => React.ReactNode | null;
}

class PaintTypeRegistry {
  private handlers = new Map<string, PaintTypeHandler<unknown>>();

  private isSolid(paint: PaintInstance): paint is SolidPaint {
    return paint.kind === 'solid';
  }

  register<TPayload = unknown>(handler: PaintTypeHandler<TPayload>): void {
    this.handlers.set(handler.kind, handler as unknown as PaintTypeHandler<unknown>);
  }

  unregister(kind: string): void {
    this.handlers.delete(kind);
  }

  getHandler(kind: string): PaintTypeHandler | undefined {
    return this.handlers.get(kind);
  }

  getPaintValue(paint: PaintInstance, options?: { idOverride?: string }): string {
    const handler = this.handlers.get(paint.kind);
    if (handler?.getPaintValue) {
      return handler.getPaintValue(paint as CustomPaint, options);
    }

    if (this.isSolid(paint)) {
      return paint.value;
    }

    const id = options?.idOverride ?? (paint as CustomPaint).id;
    return `url(#${id})`;
  }

  ensureDefinition(paint: PaintInstance | undefined, store: CanvasStore): void {
    if (!paint) return;
    const handler = this.handlers.get(paint.kind);
    handler?.ensureDefinition?.(paint as CustomPaint, store);
  }

  renderSwatchDef(
    paint: PaintInstance | undefined,
    options: { localId: string; store: CanvasStore }
  ): React.ReactNode | null {
    if (!paint) return null;
    const handler = this.handlers.get(paint.kind);
    if (!handler?.renderSwatchDef) return null;
    if (paint.kind === 'solid') return null;
    return handler.renderSwatchDef(paint as CustomPaint, options);
  }
}

export const paintTypeRegistry = new PaintTypeRegistry();

// Core handler for solid colors
paintTypeRegistry.register({
  kind: 'solid',
  getPaintValue: (paint) => (paint as SolidPaint).value,
});
