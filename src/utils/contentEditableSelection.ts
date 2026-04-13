export interface TextSelectionOffsets {
  start: number;
  end: number;
}

export interface TextSelectionTraversalOptions {
  isIgnoredNode?: (node: Node) => boolean;
  isLineBreakElement?: (element: Element) => boolean;
  isLineContainer?: (element: Element) => boolean;
  isBlockElement?: (element: Element) => boolean;
}

interface TextSegment {
  kind: 'text';
  node: Text;
  start: number;
  end: number;
}

interface NewlineSegment {
  kind: 'newline';
  parent: Node;
  childIndex: number;
  start: number;
  end: number;
}

type SelectionSegment = TextSegment | NewlineSegment;
type RangeBoundaryAffinity = 'start' | 'end';

const BLOCK_TAGS = new Set(['DIV', 'P']);

const normalizeNodeText = (value: string): string => value.replace(/\u00A0/g, ' ');

const isElementNode = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

const isTextNodeRenderable = (node: Node): boolean => (
  node.nodeType === Node.TEXT_NODE && normalizeNodeText(node.textContent ?? '').length > 0
);

const isRenderableNode = (
  node: Node,
  options: TextSelectionTraversalOptions,
): boolean => {
  if (options.isIgnoredNode?.(node)) {
    return false;
  }

  if (isTextNodeRenderable(node)) {
    return true;
  }

  if (!isElementNode(node)) {
    return false;
  }

  if ((options.isLineBreakElement ?? ((element: Element) => element.tagName === 'BR'))(node)) {
    return true;
  }

  return Array.from(node.childNodes).some((child) => isRenderableNode(child, options));
};

const hasFollowingRenderableSibling = (
  node: Node,
  options: TextSelectionTraversalOptions,
): boolean => {
  let sibling = node.nextSibling;
  while (sibling) {
    if (isRenderableNode(sibling, options)) {
      return true;
    }
    sibling = sibling.nextSibling;
  }
  return false;
};

const getChildIndex = (node: Node): number => {
  const parent = node.parentNode;
  if (!parent) {
    return 0;
  }

  return Array.prototype.indexOf.call(parent.childNodes, node);
};

const collectSelectionSegments = (
  root: Node,
  options: TextSelectionTraversalOptions,
): { segments: SelectionSegment[]; totalLength: number } => {
  const segments: SelectionSegment[] = [];
  let cursor = 0;

  const pushNewlineAfterNode = (node: Node) => {
    const parent = node.parentNode;
    if (!parent) {
      return;
    }

    segments.push({
      kind: 'newline',
      parent,
      childIndex: getChildIndex(node) + 1,
      start: cursor,
      end: cursor + 1,
    });
    cursor += 1;
  };

  const visit = (node: Node) => {
    if (options.isIgnoredNode?.(node)) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = normalizeNodeText(node.textContent ?? '');
      if (!text.length) {
        return;
      }

      segments.push({
        kind: 'text',
        node: node as Text,
        start: cursor,
        end: cursor + text.length,
      });
      cursor += text.length;
      return;
    }

    if (!isElementNode(node)) {
      return;
    }

    const isLineBreak = (options.isLineBreakElement ?? ((element: Element) => element.tagName === 'BR'))(node);
    if (isLineBreak) {
      pushNewlineAfterNode(node);
      return;
    }

    Array.from(node.childNodes).forEach(visit);

    const isLineContainer = options.isLineContainer?.(node) ?? false;
    const isBlockElement = options.isBlockElement?.(node) ?? BLOCK_TAGS.has(node.tagName);
    if (node !== root && (isLineContainer || isBlockElement) && hasFollowingRenderableSibling(node, options)) {
      pushNewlineAfterNode(node);
    }
  };

  Array.from(root.childNodes).forEach(visit);
  return { segments, totalLength: cursor };
};

const getSegmentBoundary = (segment: SelectionSegment, kind: RangeBoundaryAffinity): { container: Node; offset: number } => {
  if (segment.kind === 'text') {
    return {
      container: segment.node,
      offset: kind === 'start' ? 0 : (segment.node.textContent?.length ?? 0),
    };
  }

  return {
    container: segment.parent,
    offset: segment.childIndex,
  };
};

const getRangeBoundaryAtOffset = (
  root: Node,
  offset: number,
  options: TextSelectionTraversalOptions,
  affinity: RangeBoundaryAffinity,
): { container: Node; offset: number } => {
  const { segments, totalLength } = collectSelectionSegments(root, options);
  const clampedOffset = Math.max(0, Math.min(offset, totalLength));

  if (segments.length === 0) {
    return { container: root, offset: 0 };
  }

  for (const segment of segments) {
    if (segment.kind === 'text') {
      const matches = affinity === 'start'
        ? clampedOffset >= segment.start && clampedOffset < segment.end
        : clampedOffset >= segment.start && clampedOffset <= segment.end;
      if (matches) {
        return {
          container: segment.node,
          offset: Math.max(0, Math.min(segment.node.textContent?.length ?? 0, clampedOffset - segment.start)),
        };
      }
      continue;
    }

    const matches = affinity === 'start'
      ? clampedOffset >= segment.start && clampedOffset < segment.end
      : clampedOffset >= segment.start && clampedOffset <= segment.end;
    if (matches) {
      return {
        container: segment.parent,
        offset: segment.childIndex,
      };
    }
  }

  return getSegmentBoundary(segments[segments.length - 1], 'end');
};

const getPlainTextLength = (
  root: Node,
  options: TextSelectionTraversalOptions,
): number => collectSelectionSegments(root, options).totalLength;

export const getContentEditableSelectionOffsets = (
  root: HTMLElement,
  range: Range,
  options: TextSelectionTraversalOptions = {},
): TextSelectionOffsets => {
  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(root);
  prefixRange.setEnd(range.startContainer, range.startOffset);

  const start = getPlainTextLength(prefixRange.cloneContents(), options);
  const selectedLength = getPlainTextLength(range.cloneContents(), options);

  return {
    start,
    end: start + selectedLength,
  };
};

export const createContentEditableRangeFromOffsets = (
  root: HTMLElement,
  selection: TextSelectionOffsets,
  options: TextSelectionTraversalOptions = {},
): Range => {
  const startBoundary = getRangeBoundaryAtOffset(root, selection.start, options, 'start');
  const endBoundary = getRangeBoundaryAtOffset(root, selection.end, options, 'end');
  const range = document.createRange();
  range.setStart(startBoundary.container, startBoundary.offset);
  range.setEnd(endBoundary.container, endBoundary.offset);
  return range;
};