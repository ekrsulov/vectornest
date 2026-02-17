import type { CanvasStore } from '../store/canvasStore';
import type { SvgDefsEditor } from '../types/plugins';

export interface RegisteredSvgDefsEditor {
  pluginId: string;
  editor: SvgDefsEditor<CanvasStore>;
}

class SvgDefsEditorRegistry {
  private editors: RegisteredSvgDefsEditor[] = [];

  register(pluginId: string, editor: SvgDefsEditor<CanvasStore>): void {
    // ensure single entry per plugin + editor id
    this.editors = this.editors.filter(
      (entry) => !(entry.pluginId === pluginId && entry.editor.id === editor.id)
    );
    this.editors.push({ pluginId, editor });
  }

  unregisterPlugin(pluginId: string): void {
    this.editors = this.editors.filter((entry) => entry.pluginId !== pluginId);
  }

  getAll(): RegisteredSvgDefsEditor[] {
    return [...this.editors];
  }
}

export const svgDefsEditorRegistry = new SvgDefsEditorRegistry();
