import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { InlineTextEditSlice } from './inlineEditSlice';
import type { NativeTextElement } from './types';
import { measureNativeTextBounds } from '../../utils/measurementUtils';

interface InlineTextEditorOverlayProps {
  viewport: { zoom: number; panX: number; panY: number };
  canvasSize: { width: number; height: number };
}

/**
 * Parse a contentEditable div into { plainText, html } for committing to the element.
 * We keep it simple — inline editing produces plain text with line breaks.
 */
const parseEditableContent = (el: HTMLDivElement): { plainText: string; html: string } => {
  // Get the text content, handling <br> and div/p as newlines
  const clone = el.cloneNode(true) as HTMLDivElement;
  // Normalize block-level children into newlines
  const blocks = clone.querySelectorAll('div, p');
  blocks.forEach((block) => {
    block.insertAdjacentText('beforebegin', '\n');
  });
  const brs = clone.querySelectorAll('br');
  brs.forEach((br) => {
    br.replaceWith('\n');
  });
  const plainText = (clone.textContent ?? '').replace(/^\n/, '');
  const html = el.innerHTML;
  return { plainText, html };
};

/**
 * Derive the CSS transform for correctly positioning the inline editor
 * on top of the SVG text element, accounting for the element's transform matrix.
 */
const computeEditorTransform = (
  data: NativeTextElement['data'],
  zoom: number
): string => {
  const transforms: string[] = [];

  if (data.transformMatrix) {
    const m = data.transformMatrix;
    transforms.push(`matrix(${m[0]}, ${m[1]}, ${m[2]}, ${m[3]}, 0, 0)`);
  } else if (data.transform) {
    if (data.transform.rotation) {
      transforms.push(`rotate(${data.transform.rotation}deg)`);
    }
    if (data.transform.scaleX !== undefined || data.transform.scaleY !== undefined) {
      transforms.push(`scale(${data.transform.scaleX ?? 1}, ${data.transform.scaleY ?? 1})`);
    }
  }

  // Scale compensate: the container is placed in screen coords but
  // the text metrics are in canvas coords, so we scale by zoom.
  // Actually the whole position is computed with zoom, so we just need
  // the rotation/scale part from the element transform.
  void zoom; // zoom applied via positioning, not transform
  return transforms.length > 0 ? transforms.join(' ') : 'none';
};

/**
 * Get the origin for CSS transformations (anchor point in the editor div)
 * based on the textAnchor property.
 */
const getTransformOrigin = (textAnchor?: string): string => {
  switch (textAnchor) {
    case 'middle':
      return 'center top';
    case 'end':
      return 'right top';
    default:
      return 'left top';
  }
};

/**
 * Get the CSS text-align from textAnchor.
 */
const getTextAlign = (textAnchor?: string): 'left' | 'center' | 'right' => {
  switch (textAnchor) {
    case 'middle':
      return 'center';
    case 'end':
      return 'right';
    default:
      return 'left';
  }
};



export const InlineTextEditorOverlay: React.FC<InlineTextEditorOverlayProps> = ({
  viewport,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef(false);

  const editingElementId = useCanvasStore(
    (s) => (s as unknown as InlineTextEditSlice).inlineTextEdit?.editingElementId ?? null
  );
  const stopInlineTextEdit = useCanvasStore(
    (s) => (s as unknown as InlineTextEditSlice).stopInlineTextEdit
  );
  const elements = useCanvasStore((s) => s.elements);
  const updateElement = useCanvasStore((s) => s.updateElement);

  const element = useMemo(() => {
    if (!editingElementId) return null;
    return elements.find((el) => el.id === editingElementId && el.type === 'nativeText') as
      | NativeTextElement
      | undefined ?? null;
  }, [elements, editingElementId]);

  // Track original text to detect changes
  const [originalText, setOriginalText] = useState<string>('');

  // Focus the editor when it mounts
  useEffect(() => {
    if (element && editorRef.current) {
      committedRef.current = false;
      const data = element.data;
      const text = data.text ?? '';
      setOriginalText(text);

      // Set initial content as plain text with <br> for newlines
      const lines = text.split(/\r?\n/);
      editorRef.current.innerHTML = lines
        .map((line, i) => (i === 0 ? escapeHtml(line || '\u200B') : `<div>${escapeHtml(line || '\u200B')}</div>`))
        .join('');

      // Focus and select all
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.selectAllChildren(editorRef.current);
        // Collapse to end so cursor is at the end
        sel.collapseToEnd();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingElementId]);

  const commitEdit = useCallback(() => {
    if (committedRef.current || !editingElementId || !editorRef.current || !updateElement) return;
    committedRef.current = true;

    const { plainText } = parseEditableContent(editorRef.current);

    // Only update if text actually changed
    if (plainText !== originalText) {
      const el = useCanvasStore.getState().elements.find((e) => e.id === editingElementId);
      if (el && el.type === 'nativeText') {
        const data = el.data as NativeTextElement['data'];
        // For inline editing we update plain text and clear rich text/spans
        // since the inline editor doesn't support rich formatting
        const lines = plainText.split(/\r?\n/);
        const spans = lines.map((lineText, lineIdx) => ({
          text: lineText,
          line: lineIdx,
          fontWeight: data.fontWeight ?? undefined,
          fontStyle: data.fontStyle ?? undefined,
        }));

        updateElement(editingElementId, {
          data: {
            ...data,
            text: plainText,
            richText: plainText,
            spans: spans.length > 1 ? spans : undefined,
          },
        });
      }
    }

    stopInlineTextEdit?.();
  }, [editingElementId, originalText, updateElement, stopInlineTextEdit]);

  const cancelEdit = useCallback(() => {
    committedRef.current = true; // prevent commitEdit from running on blur
    stopInlineTextEdit?.();
  }, [stopInlineTextEdit]);

  // Handle keydown events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        // Enter without shift commits (Shift+Enter adds newline)
        // Actually, let Enter work normally for multiline text
        // Only commit on Escape or blur
      }
      // Stop propagation so canvas shortcuts don't fire
      e.stopPropagation();
    },
    [cancelEdit]
  );

  // Handle blur — commit changes
  const handleBlur = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

  // Prevent pointer events from reaching the canvas
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  if (!element) return null;

  const { data } = element;
  const { zoom, panX, panY } = viewport;

  // Bounding box en canvas coords
  const bounds = measureNativeTextBounds(data);
  // Convert a la pantalla (canvas overlay coords)
  const left = bounds.minX * zoom + panX;
  const top = bounds.minY * zoom + panY;
  const width = (bounds.maxX - bounds.minX) * zoom;
  const height = (bounds.maxY - bounds.minY) * zoom;

  const cssTransform = computeEditorTransform(data, zoom);
  const textAlign = getTextAlign(data.textAnchor);
  const transformOrigin = getTransformOrigin(data.textAnchor);
  const scaledFontSize = data.fontSize * zoom;
  const lineHeight = data.lineHeight ?? 1.2;
  const letterSpacing = data.letterSpacing ? `${data.letterSpacing * zoom}px` : undefined;

  const style: React.CSSProperties = {
    position: 'absolute',
    left,
    top,
    width: `${width}px`,
    height: `${height}px`,
    fontSize: `${scaledFontSize}px`,
    fontFamily: data.fontFamily,
    fontWeight: data.fontWeight ?? 'normal',
    fontStyle: data.fontStyle ?? 'normal',
    lineHeight: lineHeight,
    letterSpacing,
    textAlign,
    textDecoration: data.textDecoration !== 'none' ? data.textDecoration : undefined,
    textTransform: data.textTransform !== 'none' ? data.textTransform : undefined,
    color: data.fillColor ?? '#000',
    opacity: data.fillOpacity ?? 1,
    transform: cssTransform !== 'none' ? cssTransform : undefined,
    transformOrigin,
    outline: 'none',
    border: 'none',
    borderRadius: 0,
    background: 'none',
    boxShadow: 'none',
    boxSizing: 'border-box',
    padding: 0,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'keep-all',
    overflowWrap: 'normal',
    zIndex: 9999,
    caretColor: 'var(--chakra-colors-blue-400, #3182CE)',
    cursor: 'text',
    // Writing mode
    writingMode: data.writingMode !== 'horizontal-tb' ? (data.writingMode as React.CSSProperties['writingMode']) : undefined,
    // Pointer events must be enabled
    pointerEvents: 'auto',
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Inline text editor"
      spellCheck={false}
      style={style}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPointerDown={handlePointerDown}
    />
  );
};

InlineTextEditorOverlay.displayName = 'InlineTextEditorOverlay';

/** Escape HTML special characters for safe insertion into innerHTML */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
