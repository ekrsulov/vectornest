export interface SanitizeSvgOptions {
  /**
   * Keep <foreignObject> elements. When false, all foreignObject nodes are removed.
   * Defaults to true.
   */
  allowForeignObject?: boolean;
  /**
   * Allow external URLs in href/xlink:href/src and style url(...).
   * Defaults to true.
   */
  allowExternalUrls?: boolean;
}

const MINIMAL_SAFE_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

const isSafeUrlFragmentRef = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^url\(\s*#.+\s*\)$/i.test(trimmed);
};

const hasUnsafeUrlInStyle = (styleValue: string): boolean => {
  const lower = styleValue.toLowerCase();
  if (lower.includes('javascript:') || lower.includes('expression(')) return true;
  // url(...) must be internal only: url(#id)
  const matches = lower.match(/url\(([^)]+)\)/g);
  if (!matches) return false;
  return matches.some((m) => !isSafeUrlFragmentRef(m));
};

const isExternalHref = (href: string): boolean => {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('#')) return false;
  // Relative references are still external from the app's perspective.
  return true;
};

/**
 * Sanitize SVG markup by removing potentially dangerous elements/attributes.
 * This is a best-effort sanitizer used for untrusted SVG sources (clipboard/LLM).
 */
export function sanitizeSvgContent(svgString: string, options: SanitizeSvgOptions = {}): string {
  const { allowForeignObject = true, allowExternalUrls = true } = options;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const parserError = doc.querySelector('parsererror');
    const svg = doc.querySelector('svg');

    if (parserError || !svg) {
      return MINIMAL_SAFE_SVG;
    }

    // Remove script elements
    svg.querySelectorAll('script').forEach((el) => el.remove());

    if (!allowForeignObject) {
      svg.querySelectorAll('foreignObject').forEach((el) => el.remove());
    } else {
      // Sanitize foreignObject content while preserving the element
      svg.querySelectorAll('foreignObject').forEach((el) => {
        const targets = [el, ...Array.from(el.querySelectorAll('*'))];
        targets.forEach((target) => {
          Array.from(target.attributes).forEach((attr) => {
            const name = attr.name.toLowerCase();
            const value = attr.value.trim().toLowerCase();
            if (name.startsWith('on')) {
              target.removeAttribute(attr.name);
              return;
            }
            if ((name === 'href' || name === 'xlink:href' || name === 'src') && value.startsWith('javascript:')) {
              target.removeAttribute(attr.name);
              return;
            }
            if (name === 'style' && (value.includes('expression(') || value.includes('javascript:'))) {
              target.removeAttribute(attr.name);
            }
          });
        });
        el.querySelectorAll('script').forEach((node) => node.remove());
      });
    }

    // Remove event handler attributes and sanitize dangerous style/url usage
    svg.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const nameLower = attr.name.toLowerCase();
        const value = attr.value.trim();

        if (nameLower.startsWith('on')) {
          el.removeAttribute(attr.name);
          return;
        }

        if (!allowExternalUrls && (nameLower === 'href' || nameLower === 'xlink:href' || nameLower === 'src')) {
          if (isExternalHref(value)) {
            el.removeAttribute(attr.name);
          }
          return;
        }

        if (nameLower === 'style' && !allowExternalUrls && hasUnsafeUrlInStyle(value)) {
          el.removeAttribute(attr.name);
          return;
        }

        if (
          !allowExternalUrls &&
          ['fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-start', 'marker-mid', 'marker-end'].includes(nameLower)
        ) {
          const lower = value.toLowerCase();
          if (lower.includes('url(') && !isSafeUrlFragmentRef(value)) {
            el.removeAttribute(attr.name);
          }
        }
      });
    });

    // Sanitize external references (always strip javascript/data:text/html)
    svg.querySelectorAll('[href], [xlink\\:href], [src]').forEach((el) => {
      const href = el.getAttribute('href') || el.getAttribute('xlink:href') || el.getAttribute('src');
      if (!href) return;
      const lower = href.trim().toLowerCase();
      if (lower.startsWith('javascript:') || lower.startsWith('data:text/html')) {
        el.removeAttribute('href');
        el.removeAttribute('xlink:href');
        el.removeAttribute('src');
      }
    });

    // Merge multiple <defs> into the first one to avoid dropped definitions
    const defsList = Array.from(svg.querySelectorAll('defs'));
    if (defsList.length > 1) {
      const [primary, ...rest] = defsList;
      rest.forEach((defs) => {
        Array.from(defs.childNodes).forEach((child) => {
          primary.appendChild(child.cloneNode(true));
        });
        defs.remove();
      });
    }

    return new XMLSerializer().serializeToString(svg);
  } catch {
    return MINIMAL_SAFE_SVG;
  }
}
