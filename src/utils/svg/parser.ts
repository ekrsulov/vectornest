export type ParsedColor = {
  color: string | null;
  opacity: number | null;
};

export function parseColorOpacity(value: string | null | undefined): ParsedColor {
  if (!value) {
    return { color: null, opacity: null };
  }

  const trimmed = value.trim();
  const rgbaMatch = trimmed.match(/^rgba?\(\s*([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map((part) => part.trim());
    const [r, g, b] = parts.slice(0, 3).map((part) => parseFloat(part));
    const a = parts.length >= 4 ? parseFloat(parts[3]) : 1;
    if ([r, g, b].every((component) => Number.isFinite(component))) {
      return {
        color: `rgb(${r}, ${g}, ${b})`,
        opacity: Number.isFinite(a) ? a : null,
      };
    }
  }

  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = parseInt(hex.slice(6, 8), 16) / 255;
      return {
        color: `rgb(${r}, ${g}, ${b})`,
        opacity: Number.isFinite(a) ? a : null,
      };
    }
    if (hex.length === 6) {
      return { color: trimmed, opacity: null };
    }
    if (hex.length === 4) {
      // Expand #RGBA → #RRGGBBAA
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const a = parseInt(hex[3] + hex[3], 16) / 255;
      return {
        color: `rgb(${r}, ${g}, ${b})`,
        opacity: Number.isFinite(a) ? a : null,
      };
    }
    if (hex.length === 3) {
      // Expand #RGB → #RRGGBB
      const expanded = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
      return { color: expanded, opacity: null };
    }
  }

  return { color: trimmed, opacity: null };
}

export function parseStyleRules(cssText: string): Record<string, Record<string, string>> {
  const rules: Record<string, Record<string, string>> = {};
  if (!cssText) {
    return rules;
  }

  const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = cleaned.split('}').map((block) => block.trim()).filter(Boolean);
  blocks.forEach((block) => {
    const [selectorPart, bodyPart] = block.split('{');
    if (!selectorPart || !bodyPart) {
      return;
    }

    const selector = selectorPart.trim();
    const body = bodyPart.trim();
    if (!selector.startsWith('.')) {
      return;
    }

    const declarations = body.split(';').map((declaration) => declaration.trim()).filter(Boolean);
    const declarationMap: Record<string, string> = {};

    declarations.forEach((declaration) => {
      const [prop, val] = declaration.split(':').map((token) => token.trim());
      if (!prop || !val) {
        return;
      }
      declarationMap[prop] = val;
    });

    rules[selector] = declarationMap;
  });

  return rules;
}

export function parseSvgDocument(svgContent: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid SVG file');
  }
  return doc;
}
