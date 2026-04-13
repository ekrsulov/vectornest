import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';

interface UseRichTextFormattingOptions<TParsedValue> {
  editorRef: RefObject<HTMLDivElement | null>;
  parseRichText: (html: string) => TParsedValue;
  onChange: (value: TParsedValue) => void;
}

interface UseRichTextFormattingResult {
  currentColor: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  saveSelection: () => void;
  setSelectionRange: (range: Range | null) => void;
  handleCommand: (command: string, value?: string) => void;
}

type TextFormattingCommand = 'foreColor' | 'bold' | 'italic' | 'underline';

const supportedFormattingCommands = new Set<TextFormattingCommand>([
  'foreColor',
  'bold',
  'italic',
  'underline',
]);

const isFormattingCommand = (command: string): command is TextFormattingCommand => (
  supportedFormattingCommands.has(command as TextFormattingCommand)
);

const isBoldFontWeight = (fontWeight: string): boolean => {
  const numericWeight = Number.parseInt(fontWeight, 10);
  if (Number.isFinite(numericWeight)) {
    return numericWeight >= 600;
  }
  return fontWeight === 'bold' || fontWeight === 'bolder';
};

export function useRichTextFormatting<TParsedValue>({
  editorRef,
  parseRichText,
  onChange,
}: UseRichTextFormattingOptions<TParsedValue>): UseRichTextFormattingResult {
  const [currentColor, setCurrentColor] = useState('#000000');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const selectionRef = useRef<Range | null>(null);

  const getSelectionInEditor = useCallback((): { selection: Selection; range: Range } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const editor = editorRef.current;
    if (!editor || !editor.contains(range.commonAncestorContainer)) {
      return null;
    }

    return { selection, range };
  }, [editorRef]);

  const getEffectiveSelectionRange = useCallback((): { selection: Selection | null; range: Range } | null => {
    const liveSelection = getSelectionInEditor();
    if (liveSelection) {
      return liveSelection;
    }

    if (!selectionRef.current) {
      return null;
    }

    return {
      selection: null,
      range: selectionRef.current,
    };
  }, [getSelectionInEditor]);

  const getSelectionContainerElement = useCallback((range: Range): HTMLElement | null => {
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    if (!(node instanceof HTMLElement)) {
      return null;
    }
    return node;
  }, []);

  const resolveDataFillColor = useCallback((element: HTMLElement | null): string | null => {
    const editor = editorRef.current;
    let current = element;

    while (current) {
      const fill = current.getAttribute('data-fill');
      if (fill) {
        return fill;
      }

      if (current === editor) {
        break;
      }

      current = current.parentElement;
    }

    return null;
  }, [editorRef]);

  const updateActiveStatesFromRange = useCallback((range: Range | null) => {
    if (!range) {
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      return;
    }

    const element = getSelectionContainerElement(range);
    if (!element) {
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      return;
    }

    const computedStyle = window.getComputedStyle(element);
    setIsBold(isBoldFontWeight(computedStyle.fontWeight));
    setIsItalic(computedStyle.fontStyle === 'italic' || computedStyle.fontStyle === 'oblique');

    const textDecoration = computedStyle.textDecorationLine || computedStyle.textDecoration || '';
    setIsUnderline(textDecoration.includes('underline'));

    const fillColor = resolveDataFillColor(element) || computedStyle.color;
    if (fillColor) {
      setCurrentColor(fillColor);
    }
  }, [getSelectionContainerElement, resolveDataFillColor]);

  const applyStyledWrapperToSelection = useCallback((
    styles: { fontWeight?: string; fontStyle?: string; textDecoration?: string }
  ): boolean => {
    const selectionState = getEffectiveSelectionRange();
    if (!selectionState) {
      return false;
    }

    const { selection, range } = selectionState;
    if (range.collapsed) {
      return false;
    }

    const selectedContent = range.extractContents();
    const wrapper = document.createElement('span');
    if (styles.fontWeight) {
      wrapper.style.fontWeight = styles.fontWeight;
    }
    if (styles.fontStyle) {
      wrapper.style.fontStyle = styles.fontStyle;
    }
    if (styles.textDecoration) {
      wrapper.style.textDecoration = styles.textDecoration;
    }
    wrapper.appendChild(selectedContent);

    range.insertNode(wrapper);
    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(nextRange);
    }
    selectionRef.current = nextRange;

    return true;
  }, [getEffectiveSelectionRange]);

  const updateActiveStates = useCallback(() => {
    const selectionState = getEffectiveSelectionRange();
    updateActiveStatesFromRange(selectionState?.range ?? null);
  }, [getEffectiveSelectionRange, updateActiveStatesFromRange]);

  const saveSelection = useCallback(() => {
    const selectionState = getSelectionInEditor();
    if (selectionState) {
      selectionRef.current = selectionState.range;
    }
    updateActiveStates();
  }, [getSelectionInEditor, updateActiveStates]);

  const setSelectionRange = useCallback((range: Range | null) => {
    selectionRef.current = range;
    updateActiveStatesFromRange(range);
  }, [updateActiveStatesFromRange]);

  const emitEditorChange = useCallback(() => {
    const html = editorRef.current?.innerHTML || '';
    onChange(parseRichText(html));
  }, [editorRef, onChange, parseRichText]);

  const handleCommand = useCallback((command: string, value?: string) => {
    if (!isFormattingCommand(command)) {
      return;
    }

    const liveSelection = getSelectionInEditor();

    if (command === 'foreColor') {
      const selectionState = getEffectiveSelectionRange();
      if (selectionState) {
        const { selection, range } = selectionState;
        if (!range.collapsed) {
          const selectedText = range.extractContents();
          const span = document.createElement('span');

          let dataFillValue = value || '';
          if (value && !value.startsWith('#') && !value.startsWith('url(')) {
            dataFillValue = `url(#${value})`;
          }
          span.setAttribute('data-fill', dataFillValue);

          let displayColor = value || '';
          if (value?.startsWith('url(')) {
            const container = selection?.anchorNode?.parentElement ?? getSelectionContainerElement(range);
            if (container) {
              const computedColor = window.getComputedStyle(container).color;
              if (
                computedColor &&
                computedColor !== 'rgba(0, 0, 0, 0)' &&
                computedColor !== 'transparent'
              ) {
                displayColor = computedColor;
              } else {
                const walker = document.createTreeWalker(
                  range.commonAncestorContainer,
                  NodeFilter.SHOW_ELEMENT,
                  {
                    acceptNode: (node) => {
                      const element = node as HTMLElement;
                      return element.hasAttribute('data-fill') || element.style.color
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_SKIP;
                    },
                  }
                );

                let node = walker.nextNode() as HTMLElement;
                while (node) {
                  const existingColor = node.getAttribute('data-fill') || node.style.color;
                  if (existingColor && !existingColor.startsWith('url(')) {
                    displayColor = existingColor;
                    break;
                  }
                  node = walker.nextNode() as HTMLElement;
                }

                if (!displayColor) {
                  displayColor = '#000000';
                }
              }
            } else {
              displayColor = '#000000';
            }
          }

          span.style.color = displayColor;
          span.appendChild(selectedText);
          range.insertNode(span);
          const nextRange = document.createRange();
          nextRange.selectNodeContents(span);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(nextRange);
          }
          selectionRef.current = nextRange;
          emitEditorChange();
        }
      }
    } else {
      const commandApplied = command === 'bold'
        ? applyStyledWrapperToSelection({ fontWeight: isBold ? 'normal' : 'bold' })
        : command === 'italic'
          ? applyStyledWrapperToSelection({ fontStyle: isItalic ? 'normal' : 'italic' })
          : applyStyledWrapperToSelection({ textDecoration: isUnderline ? 'none' : 'underline' });

      if (commandApplied) {
        emitEditorChange();
      }
    }

    if (liveSelection) {
      editorRef.current?.focus();
      saveSelection();
    } else {
      updateActiveStatesFromRange(selectionRef.current);
    }
  }, [
    applyStyledWrapperToSelection,
    editorRef,
    emitEditorChange,
    getEffectiveSelectionRange,
    getSelectionContainerElement,
    getSelectionInEditor,
    isBold,
    isItalic,
    isUnderline,
    saveSelection,
    updateActiveStatesFromRange,
  ]);

  return {
    currentColor,
    isBold,
    isItalic,
    isUnderline,
    saveSelection,
    setSelectionRange,
    handleCommand,
  };
}
