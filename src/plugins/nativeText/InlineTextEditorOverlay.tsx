import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { InlineTextEditSlice } from './inlineEditSlice';
import type { NativeTextElement } from './types';
import { isTouchDevice } from '../../utils/domHelpers';
import { PanelStyledButton } from '../../ui/PanelStyledButton';

interface InlineTextEditorOverlayProps {
  viewport: { zoom: number; panX: number; panY: number };
  canvasSize: { width: number; height: number };
}

/**
 * Returns true when the element has a non-trivial transform that would make
 * a transparent overlay misleading (rotated, scaled, or matrix-transformed).
 */
const hasNonTrivialTransform = (data: NativeTextElement['data']): boolean => {
  if (data.transformMatrix) {
    // Matrix [a,b,c,d,e,f]: identity = [1,0,0,1,e,f]
    const [a, b, c, d] = data.transformMatrix;
    const isIdentityRotScale = Math.abs(a - 1) < 1e-6 && Math.abs(b) < 1e-6 && Math.abs(c) < 1e-6 && Math.abs(d - 1) < 1e-6;
    return !isIdentityRotScale;
  }
  if (data.transform) {
    const hasRotation = data.transform.rotation !== undefined && data.transform.rotation !== 0;
    const hasScale =
      (data.transform.scaleX !== undefined && data.transform.scaleX !== 1) ||
      (data.transform.scaleY !== undefined && data.transform.scaleY !== 1);
    return hasRotation || hasScale;
  }
  return false;
};

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
  const cancelledRef = useRef(false);

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

  // Keep original text for Escape-cancel
  const originalTextRef = useRef<string>('');

  // Determine panel mode here so useEffect can skip SVG positioning when in panel
  const isTouch = isTouchDevice();

  // Focus the editor and position it over the SVG element on editing start
  useEffect(() => {
    if (!element || !editorRef.current) return;
    cancelledRef.current = false;

    const data = element.data;
    const text = data.text ?? '';
    originalTextRef.current = text;

    // In panel mode the editorRef points to the textarea inside the card — skip SVG positioning.
    const inPanelMode = isTouch || hasNonTrivialTransform(data);
    if (!inPanelMode) {
      // Position overlay over SVG text element using DOM rect.
      // The DOM rect gives tight glyph bounds (no CSS leading).
      // CSS line-height adds half-leading = (lineH-1)*fontSize/2 above the first line,
      // pushing the caret down inside the div. Shift top UP and expand height to cancel.
      const svgTextEl = document.querySelector<SVGTextElement>(`[data-element-id="${element.id}"]`);
      if (svgTextEl && editorRef.current) {
        const svgRect = svgTextEl.getBoundingClientRect();
        const parentEl = editorRef.current.offsetParent as HTMLElement | null;
        const parentRect = parentEl?.getBoundingClientRect() ?? { left: 0, top: 0 };

        const { zoom } = viewport;
        const lineHeight = data.lineHeight ?? 1.2;
        const halfLeadingPx = Math.max(0, lineHeight - 1) * data.fontSize * zoom / 2;

        editorRef.current.style.left = `${svgRect.left - parentRect.left}px`;
        editorRef.current.style.top = `${svgRect.top - parentRect.top - halfLeadingPx}px`;
        editorRef.current.style.width = `${svgRect.width}px`;
        editorRef.current.style.height = `${svgRect.height + halfLeadingPx * 2}px`;
      }
    }

    // Set initial content as plain text with <br> for newlines
    const lines = text.split(/\r?\n/);
    editorRef.current.innerHTML = lines
      .map((line, i) => (i === 0 ? escapeHtml(line || '\u200B') : `<div>${escapeHtml(line || '\u200B')}</div>`))
      .join('');

    // Focus and place cursor at end
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.selectAllChildren(editorRef.current);
      sel.collapseToEnd();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingElementId]);

  // Apply text change to SVG element immediately
  const applyText = useCallback((plainText: string) => {
    if (!editingElementId || !updateElement) return;
    const el = useCanvasStore.getState().elements.find((e) => e.id === editingElementId);
    if (el && el.type === 'nativeText') {
      const data = el.data as NativeTextElement['data'];
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
  }, [editingElementId, updateElement]);

  // Real-time update on every keystroke
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const { plainText } = parseEditableContent(editorRef.current);
    applyText(plainText);
  }, [applyText]);

  // Blur = commit (text already live, just stop editing)
  const commitEdit = useCallback(() => {
    stopInlineTextEdit?.();
  }, [stopInlineTextEdit]);

  // Escape = restore original text then stop
  const cancelEdit = useCallback(() => {
    cancelledRef.current = true;
    applyText(originalTextRef.current);
    stopInlineTextEdit?.();
  }, [applyText, stopInlineTextEdit]);

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

  // Handle blur — commit on desktop transparent mode only
  const handleBlur = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

  // Prevent pointer events from reaching the canvas
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  if (!element) return null;

  const { data } = element;
  const { zoom } = viewport;
  const usePanelMode = isTouch || hasNonTrivialTransform(data);

  const scaledFontSize = data.fontSize * zoom;
  const lineHeight = data.lineHeight ?? 1.2;
  const letterSpacing = data.letterSpacing ? `${data.letterSpacing * zoom}px` : undefined;
  const textAlign = getTextAlign(data.textAnchor);

  // ── PANEL MODE: mobile or transformed text ───────────────────────────────────
  if (usePanelMode) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: isTouch ? 'flex-start' : 'center',
          justifyContent: 'center',
          // On mobile leave top ~15% free so panel sits near top — more space for keyboard
          paddingTop: isTouch ? '10%' : '0',
          background: 'rgba(0,0,0,0.35)',
          pointerEvents: 'auto',
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: 'var(--chakra-colors-chakra-body-bg, #fff)',
            border: '1px solid var(--chakra-colors-chakra-border-color, #E2E8F0)',
            borderRadius: '10px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
            padding: '10px',
            width: 'min(96vw, 420px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Header */}
          <div style={{
            fontSize: '11px',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 600,
            color: 'var(--chakra-colors-gray-500, #718096)',
            userSelect: 'none',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}>
            Edit text
          </div>

          {/* Editor — fixed height optimized for mobile keyboard space */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="Text editor"
            spellCheck={false}
            style={{
              width: '100%',
              // Mobile: short box so keyboard doesn't push it off screen
              // Desktop: slightly taller
              minHeight: isTouch ? '56px' : '72px',
              maxHeight: isTouch ? '28dvh' : '40dvh',
              overflowY: 'auto',
              fontSize: '16px', // 16px prevents iOS auto-zoom
              fontFamily: 'system-ui, sans-serif',
              lineHeight: 1.5,
              color: 'var(--chakra-colors-chakra-body-text, #1A202C)',
              background: 'var(--chakra-colors-chakra-subtle-bg, #F7FAFC)',
              border: '1px solid var(--chakra-colors-chakra-border-color, #E2E8F0)',
              borderRadius: '6px',
              padding: '8px 10px',
              outline: 'none',
              caretColor: 'var(--chakra-colors-blue-400, #63B3ED)',
              boxSizing: 'border-box' as const,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onBlur={(e) => {
              const related = e.relatedTarget as HTMLElement | null;
              if (related?.dataset.editorAction) return;
              if (!isTouch) commitEdit();
            }}
          />

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <PanelStyledButton
              data-editor-action="cancel"
              onPointerDown={(e) => e.preventDefault()}
              onClick={cancelEdit}
              size="sm"
              px={3}
            >
              Cancel
            </PanelStyledButton>
            <PanelStyledButton
              data-editor-action="commit"
              onPointerDown={(e) => e.preventDefault()}
              onClick={commitEdit}
              size="sm"
              px={3}
              bg="blue.500"
              color="white"
              borderColor="blue.500"
              _hover={{ bg: 'blue.600' }}
              _dark={{ bg: 'blue.400', borderColor: 'blue.400', _hover: { bg: 'blue.500' } }}
            >
              Apply
            </PanelStyledButton>
          </div>
        </div>
      </div>
    );
  }

  // ── TRANSPARENT OVERLAY MODE: desktop, no significant transform ──────────────
  const cssTransform = computeEditorTransform(data, zoom);
  const transformOrigin = getTransformOrigin(data.textAnchor);

  const style: React.CSSProperties = {
    position: 'absolute',
    // left/top/width/height set imperatively in useEffect from SVG DOM rect
    left: 0,
    top: 0,
    width: '1px',
    height: '1px',
    fontSize: `${scaledFontSize}px`,
    fontFamily: data.fontFamily,
    fontWeight: data.fontWeight ?? 'normal',
    fontStyle: data.fontStyle ?? 'normal',
    lineHeight: lineHeight,
    letterSpacing,
    textAlign,
    textDecoration: data.textDecoration !== 'none' ? data.textDecoration : undefined,
    textTransform: data.textTransform !== 'none' ? data.textTransform : undefined,
    // Fully transparent text — SVG element is the visual display
    color: 'transparent',
    caretColor: 'var(--chakra-colors-blue-400, #3182CE)',
    transform: cssTransform !== 'none' ? cssTransform : undefined,
    transformOrigin,
    outline: 'none',
    border: 'none',
    borderRadius: 0,
    background: 'transparent',
    boxShadow: 'none',
    boxSizing: 'border-box',
    padding: 0,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'keep-all',
    overflowWrap: 'normal',
    zIndex: 9999,
    cursor: 'text',
    writingMode: data.writingMode !== 'horizontal-tb' ? (data.writingMode as React.CSSProperties['writingMode']) : undefined,
    pointerEvents: 'auto',
    userSelect: 'text',
    WebkitUserSelect: 'text',
  };

  // Wrap in an overflow:hidden container so browser text-selection highlights
  // are clipped to the canvas area and do not bleed over the sidebars.
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Inline text editor"
        spellCheck={false}
        style={{ ...style, zIndex: undefined }}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onBlur={handleBlur}
        onPointerDown={handlePointerDown}
      />
    </div>
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
