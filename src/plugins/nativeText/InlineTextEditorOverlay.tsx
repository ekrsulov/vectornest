import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { InlineTextEditSlice } from './inlineEditSlice';
import type { PathElement } from '../../types';
import { PanelStyledButton } from '../../ui/PanelStyledButton';
import { buildSpansPreservingGlyphTransforms } from './inlineTextSpanUtils';

interface InlineTextEditorOverlayProps {
  viewport: { zoom: number; panX: number; panY: number };
  canvasSize: { width: number; height: number };
}

export const InlineTextEditorOverlay: React.FC<InlineTextEditorOverlayProps> = ({
  viewport: _viewport,
  canvasSize: _canvasSize,
}) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const editingElementId = useCanvasStore(
    (s) => (s as unknown as InlineTextEditSlice).inlineTextEdit?.editingElementId ?? null
  );
  const stopInlineTextEdit = useCanvasStore(
    (s) => (s as unknown as InlineTextEditSlice).stopInlineTextEdit
  );
  const elements = useCanvasStore((s) => s.elements);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const textPathElement = useMemo(() => {
    if (!editingElementId) return null;
    const el = elements.find((e) => e.id === editingElementId && e.type === 'path') as PathElement | undefined;
    if (!el) return null;
    return el.data.textPath ? el : null;
  }, [elements, editingElementId]);

  const originalTextRef = useRef<string>('');
  const [draftText, setDraftText] = useState('');

  useEffect(() => {
    if (!textPathElement) return;
    const text = textPathElement.data.textPath?.text ?? '';
    originalTextRef.current = text;
    setDraftText(text);

    const frame = window.requestAnimationFrame(() => {
      const textarea = editorRef.current;
      if (!textarea) return;
      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [textPathElement]);

  const applyText = useCallback((plainText: string) => {
    if (!editingElementId || !updateElement || !textPathElement?.data.textPath) return;
    updateElement(editingElementId, {
      data: {
        ...textPathElement.data,
        textPath: {
          ...textPathElement.data.textPath,
          text: plainText,
          richText: plainText,
          spans: buildSpansPreservingGlyphTransforms(
            plainText,
            textPathElement.data.textPath.text ?? '',
            textPathElement.data.textPath.spans,
            {
              fontWeight: textPathElement.data.textPath.fontWeight ?? undefined,
              fontStyle: textPathElement.data.textPath.fontStyle ?? undefined,
            }
          ),
        },
      },
    });
  }, [editingElementId, textPathElement, updateElement]);

  const commitEdit = useCallback(() => {
    applyText(draftText);
    stopInlineTextEdit?.();
  }, [applyText, draftText, stopInlineTextEdit]);

  const cancelEdit = useCallback(() => {
    const originalText = originalTextRef.current;
    setDraftText(originalText);
    applyText(originalText);
    stopInlineTextEdit?.();
  }, [applyText, stopInlineTextEdit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
        return;
      }
      e.stopPropagation();
    },
    [cancelEdit]
  );
  if (!textPathElement) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          width: 'min(96vw, 440px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{
          fontSize: '11px',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 600,
          color: 'var(--chakra-colors-gray-500, #718096)',
          userSelect: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Edit path text
        </div>
        <textarea
          ref={editorRef}
          value={draftText}
          aria-label="Path text editor"
          spellCheck={false}
          onChange={(e) => {
            const nextText = e.target.value;
            setDraftText(nextText);
            applyText(nextText);
          }}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            const related = e.relatedTarget as HTMLElement | null;
            if (related?.dataset.editorAction) return;
            commitEdit();
          }}
          style={{
            width: '100%',
            minHeight: '92px',
            maxHeight: '40dvh',
            resize: 'vertical',
            overflowY: 'auto',
            fontSize: '16px',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.5,
            color: 'var(--chakra-colors-chakra-body-text, #1A202C)',
            background: 'var(--chakra-colors-chakra-subtle-bg, #F7FAFC)',
            border: '1px solid var(--chakra-colors-chakra-border-color, #E2E8F0)',
            borderRadius: '6px',
            padding: '10px 12px',
            outline: 'none',
            caretColor: 'var(--chakra-colors-blue-400, #63B3ED)',
            boxSizing: 'border-box',
            whiteSpace: 'pre-wrap',
          }}
        />
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
};

InlineTextEditorOverlay.displayName = 'InlineTextEditorOverlay';
