function usesUserSpaceOnUsePaint(
  paintValue: string | undefined | null,
  doc: Document | undefined
): boolean {
  if (!paintValue || !doc) {
    return false;
  }

  const match = paintValue.match(/url\(#([^)]+)\)/);
  if (!match) {
    return false;
  }

  const refId = match[1];
  const refElement = doc.getElementById(refId);
  if (!refElement) {
    return false;
  }

  const tagName = refElement.tagName.toLowerCase();
  if (tagName === 'lineargradient' || tagName === 'radialgradient') {
    const gradientUnits = refElement.getAttribute('gradientUnits');
    return gradientUnits === 'userSpaceOnUse';
  }
  if (tagName === 'pattern') {
    const patternUnits = refElement.getAttribute('patternUnits');
    return patternUnits === 'userSpaceOnUse';
  }
  return false;
}

function hasAnimateTransform(element: Element): boolean {
  return element.querySelector('animateTransform') !== null;
}

export function shouldPreserveTransform(
  element: Element,
  doc: Document | undefined,
  hasAnimatedAncestor?: boolean
): boolean {
  if (hasAnimatedAncestor) return true;
  if (hasAnimateTransform(element)) return true;
  if (!doc) return false;

  const fill = element.getAttribute('fill') || element.getAttribute('style')?.match(/fill:\s*([^;]+)/)?.[1];
  const stroke = element.getAttribute('stroke') || element.getAttribute('style')?.match(/stroke:\s*([^;]+)/)?.[1];

  if (usesUserSpaceOnUsePaint(fill, doc)) return true;
  if (usesUserSpaceOnUsePaint(stroke, doc)) return true;

  const filterAttr = element.getAttribute('filter') || element.getAttribute('style')?.match(/filter:\s*([^;]+)/)?.[1];
  if (!filterAttr) {
    return false;
  }

  const filterMatch = filterAttr.match(/url\(#([^)]+)\)/);
  if (!filterMatch) {
    return false;
  }

  const filterEl = doc.getElementById(filterMatch[1]);
  if (!filterEl) {
    return false;
  }

  if (filterEl.getAttribute('filterUnits') === 'userSpaceOnUse') {
    return true;
  }

  const primitiveUnits = filterEl.getAttribute('primitiveUnits');
  return !primitiveUnits || primitiveUnits === 'userSpaceOnUse';
}
