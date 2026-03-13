import type { CanvasElement, PathElement } from '../types';

const URL_REGEX = /url\(#([^)]+)\)/i;
const URL_GLOBAL_REGEX = /url\(#([^)]+)\)/gi;

const extractId = (value?: string): string | null => {
  if (!value) return null;
  const match = value.match(URL_REGEX);
  return match ? match[1] : null;
};

const collectIdsFromRawContent = (rawContent: string, ids: Set<string>): void => {
  let match: RegExpExecArray | null;

  URL_GLOBAL_REGEX.lastIndex = 0;
  while ((match = URL_GLOBAL_REGEX.exec(rawContent)) !== null) {
    if (match[1]) {
      ids.add(match[1]);
    }
  }
};

export const collectUsedPaintIds = (elements: CanvasElement[]): Set<string> => {
  const ids = new Set<string>();

  const checkValue = (v?: string) => {
    const id = extractId(v);
    if (id) ids.add(id);
  };

  elements.forEach(el => {
    if (el.type === 'path') {
      const data = (el as PathElement).data;
      checkValue(data.fillColor);
      checkValue(data.strokeColor);
      if (data.textPath) {
        checkValue(data.textPath.fillColor);
        checkValue(data.textPath.strokeColor);
        if (data.textPath.spans) {
          data.textPath.spans.forEach(span => checkValue(span.fillColor));
        }
      }
    } else if (el.type === 'nativeText') {
      // Check spans for native text elements
      const data = el.data as { spans?: Array<{ fillColor?: string }>; fillColor?: string; strokeColor?: string };
      if (data.spans) {
        data.spans.forEach(span => checkValue(span.fillColor));
      }
      checkValue(data.fillColor);
      checkValue(data.strokeColor);
    } else {
      // Other elements use data.fillColor/strokeColor directly
      const data = (el as { data?: unknown }).data as {
        fillColor?: string;
        strokeColor?: string;
        rawContent?: string;
        textPath?: { fillColor?: string; strokeColor?: string };
        styleOverrides?: { fillColor?: string; strokeColor?: string };
      } | undefined;
      if (data) {
        checkValue(data.fillColor);
        checkValue(data.strokeColor);
        checkValue(data.styleOverrides?.fillColor);
        checkValue(data.styleOverrides?.strokeColor);
        if (data.textPath) {
          checkValue(data.textPath.fillColor);
          checkValue(data.textPath.strokeColor);
        }
        if (typeof data.rawContent === 'string' && data.rawContent.trim()) {
          collectIdsFromRawContent(data.rawContent, ids);
        }
      }
    }
  });

  return ids;
};
