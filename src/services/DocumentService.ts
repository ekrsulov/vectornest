import type { CanvasElement, Viewport } from '../types';

export interface DocumentAnimationDebugPayload {
  animations: unknown[];
  animationState?: unknown;
  chainDelays: Array<[string, number]>;
}

export interface SerializedCanvasDocument {
  documentName: string;
  elements: CanvasElement[];
  viewport: Viewport;
  defs: unknown;
  version: string;
  _debug_animations?: DocumentAnimationDebugPayload;
}

export interface SaveDocumentParams {
  documentName: string;
  elements: CanvasElement[];
  viewport: Viewport;
  defs: unknown;
  animationDebug?: DocumentAnimationDebugPayload;
}

export interface LoadDocumentResult {
  documentName?: string;
  elements: CanvasElement[];
}

export interface LoadDocumentParams {
  append: boolean;
  existingElements: CanvasElement[];
  generateElementId: () => string;
}

const sanitizeFileName = (name: string): string => {
  const normalized = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return normalized.length > 0 ? normalized : 'vectornest';
};

export function saveDocumentToFile({
  documentName,
  elements,
  viewport,
  defs,
  animationDebug,
}: SaveDocumentParams): void {
  let url: string | undefined;
  try {
    const payload: SerializedCanvasDocument = {
      documentName,
      elements,
      viewport,
      defs,
      version: '1.0',
      ...(animationDebug ? { _debug_animations: animationDebug } : {}),
    };

    const dataStr = JSON.stringify(payload, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFileName(documentName)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[DocumentService] Failed to save document:', error);
    }
  } finally {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}

export async function loadDocumentFromFilePicker(
  params: LoadDocumentParams
): Promise<LoadDocumentResult | null> {
  const parsedDocument = await readDocumentFromFilePicker();
  if (!parsedDocument) return null;
  return buildLoadedDocument(parsedDocument, params);
}

function readDocumentFromFilePicker(): Promise<SerializedCanvasDocument | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    const cleanup = () => {
      input.onchange = null;
      // Remove the cancel listener to avoid memory leaks
      input.remove();
    };

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        cleanup();
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        cleanup();
        try {
          const content = loadEvent.target?.result as string;
          const parsed = JSON.parse(content) as Partial<SerializedCanvasDocument>;

          if (!Array.isArray(parsed.elements)) {
            reject(new Error('Invalid document format: missing elements array'));
            return;
          }

          // Basic schema validation: every element must have an id and type
          const invalidElement = parsed.elements.find(
            (el) => !el || typeof el.id !== 'string' || typeof el.type !== 'string'
          );
          if (invalidElement) {
            reject(new Error('Invalid document format: elements must have id and type'));
            return;
          }

          resolve({
            documentName: parsed.documentName ?? 'Loaded Document',
            elements: parsed.elements,
            viewport: parsed.viewport ?? { zoom: 1, panX: 0, panY: 0 },
            defs: parsed.defs ?? null,
            version: parsed.version ?? '1.0',
            _debug_animations: parsed._debug_animations,
          });
        } catch {
          reject(new Error('Failed to parse document'));
        }
      };
      reader.onerror = () => {
        cleanup();
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    };

    // Resolve with null if the user cancels the file picker dialog (normal user action).
    input.addEventListener('cancel', () => {
      cleanup();
      resolve(null);
    });

    input.click();
  });
}

function buildLoadedDocument(
  documentData: SerializedCanvasDocument,
  { append, existingElements, generateElementId }: LoadDocumentParams
): LoadDocumentResult {
  if (!append) {
    return {
      elements: documentData.elements,
      documentName: documentData.documentName || 'Loaded Document',
    };
  }

  // Build an old→new ID map so parentId/childIds stay consistent
  const idMap = new Map<string, string>();
  for (const element of documentData.elements) {
    idMap.set(element.id, generateElementId());
  }

  const newElements = documentData.elements.map((element, index) => {
    const remapped = {
      ...element,
      id: idMap.get(element.id)!,
      zIndex: existingElements.length + index,
      parentId: element.parentId ? (idMap.get(element.parentId) ?? null) : null,
    };

    // Remap childIds for group elements
    if (element.type === 'group' && element.data && typeof element.data === 'object') {
      const data = element.data as Record<string, unknown>;
      if (Array.isArray(data.childIds)) {
        remapped.data = {
          ...element.data,
          childIds: (data.childIds as string[]).map(
            (cid: string) => idMap.get(cid) ?? cid
          ),
        };
      }
    }

    return remapped as CanvasElement;
  });

  return {
    elements: [...existingElements, ...newElements],
  };
}
