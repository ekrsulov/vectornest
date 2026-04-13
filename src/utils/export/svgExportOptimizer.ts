/**
 * SVG Export Optimizer — post-processing utilities for cleaner SVG output.
 *
 * 1. Remove `id` attributes from elements that are never referenced.
 * 2. Remove attributes whose value equals the SVG spec default.
 * 3. Prettify (indent) the final SVG markup.
 * 4. Round numeric attribute values to a given precision.
 */

// ---------------------------------------------------------------------------
// SVG specification default attribute values
// ---------------------------------------------------------------------------

const SVG_DEFAULT_ATTRIBUTES: Record<string, string> = {
  fill: 'black',
  'fill-opacity': '1',
  'fill-rule': 'nonzero',
  stroke: 'none',
  'stroke-width': '1',
  'stroke-opacity': '1',
  'stroke-linecap': 'butt',
  'stroke-linejoin': 'miter',
  'stroke-miterlimit': '4',
  'stroke-dasharray': 'none',
  'stroke-dashoffset': '0',
  opacity: '1',
  visibility: 'visible',
  display: 'inline',
  'vector-effect': 'none',
  'shape-rendering': 'auto',
  'font-style': 'normal',
  'font-weight': 'normal',
  'text-anchor': 'start',
  'text-decoration': 'none',
  'dominant-baseline': 'auto',
  'pointer-events': 'visiblePainted',
};

/**
 * Alternate representations that should also be considered "default"
 * (e.g. `#000` and `#000000` both mean `black`).
 */
const ALIAS_DEFAULTS: Record<string, Set<string>> = {
  fill: new Set(['black', '#000', '#000000']),
  stroke: new Set(['none']),
};

// ---------------------------------------------------------------------------
// Internal re-used regex patterns (compiled once)
// ---------------------------------------------------------------------------

/** Matches every `id="..."` attribute in extracted form. */
const ID_ATTR_RE = /\sid="([^"]+)"/g;

/**
 * Patterns for referencing an id:
 *   - url(#id)
 *   - href="#id"
 *   - xlink:href="#id"
 */
const ID_REF_PATTERNS = [
  /url\(#([^)]+)\)/g,
  /href="#([^"]+)"/g,
  /xlink:href="#([^"]+)"/g,
];

const INLINE_TEXT_ROOT_TAGS = new Set(['text']);

// ---------------------------------------------------------------------------
// 1. Remove unreferenced IDs
// ---------------------------------------------------------------------------

function collectReferencedIds(svg: string): Set<string> {
  const referenced = new Set<string>();
  for (const pattern of ID_REF_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(svg)) !== null) {
      referenced.add(match[1]);
    }
  }
  return referenced;
}

export function removeUnreferencedIds(svg: string): string {
  const referenced = collectReferencedIds(svg);
  return svg.replace(ID_ATTR_RE, (full, idValue: string) => {
    if (referenced.has(idValue)) {
      return full; // keep — this id is used
    }
    return ''; // strip — no one references it
  });
}

// ---------------------------------------------------------------------------
// 2. Remove default-value attributes
// ---------------------------------------------------------------------------

/**
 * For each known SVG attribute whose value matches the spec default,
 * remove the attribute from the output.
 *
 * We operate on the raw string so that we don't need a DOM parser.
 */
export function removeDefaultAttributes(svg: string): string {
  let result = svg;
  for (const [attr, defaultValue] of Object.entries(SVG_DEFAULT_ATTRIBUTES)) {
    // Build a regex that matches ` attr="value"` where value equals the default.
    // We must escape dots and other regex-special chars in the default value.
    const defaults = ALIAS_DEFAULTS[attr]
      ? new Set([...ALIAS_DEFAULTS[attr], defaultValue])
      : new Set([defaultValue]);

    for (const val of defaults) {
      const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\s${attr}="${escaped}"`, 'g');
      result = result.replace(re, '');
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 3. Prettify SVG output
// ---------------------------------------------------------------------------

/**
 * Lightweight SVG prettifier that works on string level.
 * Produces consistently indented output using two-space indentation.
 */
export function prettifySvg(svg: string): string {
  // Normalize: collapse runs of whitespace between tags into single newlines,
  // but preserve whitespace inside text content (e.g. <text>, <tspan>).

  // Split into tokens: tags vs text
  const tokens = tokenize(svg);

  const lines: string[] = [];
  let depth = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const trimmed = token.trim();
    const tagName = getTagName(trimmed);

    if (
      trimmed.startsWith('<') &&
      !trimmed.startsWith('</') &&
      !trimmed.startsWith('<?') &&
      !trimmed.startsWith('<!') &&
      tagName &&
      INLINE_TEXT_ROOT_TAGS.has(tagName) &&
      !trimmed.endsWith('/>')
    ) {
      const opaqueElement = collectOpaqueElement(tokens, index, tagName);
      lines.push('  '.repeat(depth) + opaqueElement.markup);
      index = opaqueElement.endIndex;
      continue;
    }

    if (token.startsWith('<?') || token.startsWith('<!')) {
      // Processing instruction / doctype — no indent change
      lines.push(trimmed);
    } else if (token.startsWith('</')) {
      // Closing tag
      depth = Math.max(0, depth - 1);
      lines.push('  '.repeat(depth) + trimmed);
    } else if (token.startsWith('<')) {
      lines.push('  '.repeat(depth) + trimmed);
      // Self-closing tags don't increase depth
      if (!trimmed.endsWith('/>') && !isVoidSvgElement(trimmed)) {
        depth++;
      }
    } else {
      // Text content — preserve as-is (trimmed), indented at current depth
      const text = token.trim();
      if (text) {
        lines.push('  '.repeat(depth) + text);
      }
    }
  }

  return lines.join('\n') + '\n';
}

function getTagName(token: string): string | null {
  const match = token.match(/^<\/?\s*([a-zA-Z][\w:-]*)/);
  return match ? match[1] : null;
}

function collectOpaqueElement(tokens: string[], startIndex: number, rootTagName: string): { markup: string; endIndex: number } {
  let markup = '';
  let depth = 0;

  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = tokens[index];
    const trimmed = token.trim();
    const tagName = getTagName(trimmed);
    markup += token;

    if (!tagName || tagName !== rootTagName) {
      continue;
    }

    if (trimmed.startsWith('</')) {
      depth -= 1;
      if (depth === 0) {
        return { markup, endIndex: index };
      }
      continue;
    }

    if (!trimmed.endsWith('/>') && !isVoidSvgElement(trimmed)) {
      depth += 1;
    }
  }

  return { markup, endIndex: tokens.length - 1 };
}

/** Tokenize SVG string into tags and text runs. */
function tokenize(svg: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < svg.length) {
    if (svg[i] === '<') {
      const end = svg.indexOf('>', i);
      if (end === -1) {
        tokens.push(svg.slice(i));
        break;
      }
      tokens.push(svg.slice(i, end + 1));
      i = end + 1;
    } else {
      const next = svg.indexOf('<', i);
      if (next === -1) {
        const text = svg.slice(i);
        if (text.trim()) tokens.push(text);
        break;
      }
      const text = svg.slice(i, next);
      if (text.trim()) tokens.push(text);
      i = next;
    }
  }
  return tokens;
}

function isVoidSvgElement(tag: string): boolean {
  return tag.endsWith('/>');
}

// ---------------------------------------------------------------------------
// 4. Numeric precision rounding for attribute values
// ---------------------------------------------------------------------------

/**
 * Attributes safe to round. Excludes sensitive decimal attributes:
 * - opacity, fill-opacity, stroke-opacity, stop-opacity, flood-opacity (visual fidelity)
 * - filter primitives: stdDeviation, baseFrequency, scale, slope, intercept, etc.
 * - gradient: offset (stop), spreadMethod related values
 */
const ATTR_VALUE_RE = /(\s)(x|y|cx|cy|r|rx|ry|x1|y1|x2|y2|width|height|stroke-width|stroke-dashoffset|stroke-miterlimit|font-size|letter-spacing|textLength|dx|dy|rotate|startOffset|pathLength)="([^"]*)"/g;

const VIEWBOX_RE = /(\sviewBox=")([^"]*)(")/g;
const TRANSFORM_NUM_RE = /(-?\d+\.?\d*(?:e[+-]?\d+)?)/gi;

export function roundNumericAttributes(svg: string, precision: number): string {
  const factor = 10 ** precision;
  const round = (n: number): string => {
    const rounded = Math.round(n * factor) / factor;
    return String(rounded);
  };

  let result = svg;

  // Round known numeric attributes
  result = result.replace(ATTR_VALUE_RE, (_full, space, attr, val) => {
    // stroke-dasharray has space/comma separated values
    if (attr === 'stroke-dasharray') {
      const rounded = val.split(/[\s,]+/).map((v: string) => {
        const n = Number(v);
        return Number.isFinite(n) ? round(n) : v;
      }).join(' ');
      return `${space}${attr}="${rounded}"`;
    }
    // Percentage values (e.g. startOffset="50%") — keep as-is
    if (typeof val === 'string' && val.endsWith('%')) return `${space}${attr}="${val}"`;
    const num = Number(val);
    if (Number.isFinite(num)) {
      return `${space}${attr}="${round(num)}"`;
    }
    return `${space}${attr}="${val}"`;
  });

  // Round viewBox values
  result = result.replace(VIEWBOX_RE, (_full, pre, val, post) => {
    const parts = val.split(/\s+/).map((v: string) => {
      const n = Number(v);
      return Number.isFinite(n) ? round(n) : v;
    });
    return `${pre}${parts.join(' ')}${post}`;
  });

  // Round numbers inside transform="..." values
  result = result.replace(/(\stransform=")(matrix|translate|rotate|scale|skewX|skewY)\(([^)]*)\)(")/g,
    (_full, pre, fn, nums, post) => {
      const rounded = nums.replace(TRANSFORM_NUM_RE, (numStr: string) => {
        const n = Number(numStr);
        return Number.isFinite(n) ? round(n) : numStr;
      });
      return `${pre}${fn}(${rounded})${post}`;
    });

  // Round numbers in d="..." (path data)
  result = result.replace(/(\sd=")((?:[^"]|\\")*)(")/g, (_full, pre, pathD, post) => {
    const rounded = pathD.replace(TRANSFORM_NUM_RE, (numStr: string) => {
      const n = Number(numStr);
      return Number.isFinite(n) ? round(n) : numStr;
    });
    return `${pre}${rounded}${post}`;
  });

  // Round numbers in stroke-dasharray="..."
  result = result.replace(/(\sstroke-dasharray=")((?:[^"]|\\")*)(")/g, (_full, pre, val, post) => {
    const rounded = val.split(/[\s,]+/).map((v: string) => {
      const n = Number(v);
      return Number.isFinite(n) ? round(n) : v;
    }).join(' ');
    return `${pre}${rounded}${post}`;
  });

  return result;
}

// ---------------------------------------------------------------------------
// Combined optimizer
// ---------------------------------------------------------------------------

export interface SvgOptimizeOptions {
  removeUnreferencedIds?: boolean;
  removeDefaults?: boolean;
  prettify?: boolean;
  precision?: number;
}

export function optimizeSvg(svg: string, options: SvgOptimizeOptions = {}): string {
  let result = svg;

  if (options.precision !== undefined) {
    result = roundNumericAttributes(result, options.precision);
  }

  if (options.removeDefaults) {
    result = removeDefaultAttributes(result);
  }

  if (options.removeUnreferencedIds) {
    result = removeUnreferencedIds(result);
  }

  if (options.prettify) {
    result = prettifySvg(result);
  }

  return result;
}
