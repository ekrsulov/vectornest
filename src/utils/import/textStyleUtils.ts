export interface GlobalTextStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
}

const applyTextDeclarations = (
  target: GlobalTextStyle,
  declarationString: string,
): void => {
  declarationString.split(';').forEach((rawDecl) => {
    const [rawProp, ...rawValParts] = rawDecl.split(':');
    if (!rawProp || rawValParts.length === 0) return;
    const prop = rawProp.trim().toLowerCase();
    const value = rawValParts.join(':').trim();
    if (!value) return;

    switch (prop) {
      case 'font': {
        const parsed = parseFontShorthand(value, target.fontSize ?? 16);
        target.fontFamily = parsed.fontFamily ?? target.fontFamily;
        target.fontSize = parsed.fontSize ?? target.fontSize;
        target.fontWeight = parsed.fontWeight ?? target.fontWeight;
        target.fontStyle = parsed.fontStyle ?? target.fontStyle;
        break;
      }
      case 'font-family':
        target.fontFamily = value.replace(/;$/, '') || target.fontFamily;
        break;
      case 'font-size': {
        const numeric = parseFontSize(value, target.fontSize ?? 16);
        if (numeric !== undefined) target.fontSize = numeric;
        break;
      }
      case 'font-weight':
        target.fontWeight = value.replace(/;$/, '') || target.fontWeight;
        break;
      case 'font-style':
        target.fontStyle = sanitizeFontStyle(value);
        break;
      default:
        break;
    }
  });
};

const extractTextStyleFromElement = (element: Element | null): GlobalTextStyle => {
  if (!element) {
    return {};
  }

  const extracted: GlobalTextStyle = {};
  const fontAttr = element.getAttribute('font');
  if (fontAttr) {
    applyTextDeclarations(extracted, `font:${fontAttr}`);
  }

  const fontFamily = element.getAttribute('font-family');
  if (fontFamily) {
    extracted.fontFamily = fontFamily;
  }

  const fontSize = parseFontSize(element.getAttribute('font-size'), extracted.fontSize ?? 16);
  if (fontSize !== undefined) {
    extracted.fontSize = fontSize;
  }

  const fontWeight = element.getAttribute('font-weight');
  if (fontWeight) {
    extracted.fontWeight = fontWeight;
  }

  const fontStyle = element.getAttribute('font-style');
  if (fontStyle) {
    extracted.fontStyle = sanitizeFontStyle(fontStyle);
  }

  const styleAttr = element.getAttribute('style');
  if (styleAttr) {
    applyTextDeclarations(extracted, styleAttr);
  }

  return extracted;
};

export const normalizeTextContent = (value: string): string => {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  return lines.join('\n');
};

export const sanitizeFontStyle = (value?: string | null): 'normal' | 'italic' => {
  if (value === 'italic' || value === 'oblique') {
    return 'italic';
  }
  return 'normal';
};

export const parseFontSize = (value?: string | null, base = 16): number | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  const num = parseFloat(trimmed);
  if (!Number.isFinite(num)) return undefined;
  const unit = trimmed.replace(/^[\d.+-]+/, '').trim().toLowerCase();
  if (!unit || unit === 'px') return num;
  if (unit === 'pt') return num * (96 / 72);
  if (unit === 'em' || unit === 'rem') return num * base;
  if (unit === '%') return (num / 100) * base;
  return num;
};

export const parseFontShorthand = (fontValue: string, baseSize = 16): GlobalTextStyle => {
  const cleaned = fontValue.trim().replace(/;$/, '');
  const tokens = cleaned.split(/\s+/);
  const sizeRegex = /^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/i;
  const weightRegex = /^(normal|bold|bolder|lighter|[1-9]00)$/i;

  const sizeIdx = tokens.findIndex((tok) => {
    const [sizePart] = tok.split('/');
    return sizeRegex.test(sizePart);
  });

  let fontSize: number | undefined;
  let fontFamily: string | undefined;
  if (sizeIdx !== -1) {
    const [sizePart] = tokens[sizeIdx].split('/');
    fontSize = parseFontSize(sizePart, baseSize);
    fontFamily = tokens.slice(sizeIdx + 1).join(' ').trim() || undefined;
  }

  let fontWeight: string | undefined;
  let fontStyle: 'normal' | 'italic' | undefined;
  tokens.slice(0, sizeIdx === -1 ? tokens.length : sizeIdx).forEach((tok) => {
    if (!fontWeight && weightRegex.test(tok)) {
      fontWeight = tok;
      return;
    }
    if (!fontStyle && (tok === 'italic' || tok === 'oblique')) {
      fontStyle = 'italic';
    }
  });

  return {
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle: fontStyle ?? undefined,
  };
};

export const resolveInheritedFontSize = (element: Element | null, defaults?: GlobalTextStyle): number => {
  if (!element) return defaults?.fontSize ?? 16;
  const parentSize = resolveInheritedFontSize(element.parentElement, defaults);
  const ownSize = parseFontSize(element.getAttribute('font-size'), parentSize);
  return ownSize ?? parentSize;
};

export const extractGlobalTextStyle = (doc: Document): GlobalTextStyle | null => {
  const styleEls = Array.from(doc.querySelectorAll('style'));
  const textRuleDefaults: GlobalTextStyle = {};

  styleEls.forEach((node) => {
    const content = node.textContent || '';
    const matches = content.match(/text\s*{[^}]*}/gis);

    if (matches && matches.length) {
      matches.forEach((rule) => {
        const declarationMatch = rule.match(/text\s*{([^}]*)}/i);
        if (!declarationMatch) return;
        applyTextDeclarations(textRuleDefaults, declarationMatch[1]);
      });
    } else if (!content.includes('{')) {
      const fontMatch = content.match(/font\s*:\s*([^;]+);?/i);
      if (fontMatch) {
        applyTextDeclarations(textRuleDefaults, `font:${fontMatch[1]}`);
      }
    }
  });

  const svgRoot = doc.documentElement?.tagName.toLowerCase() === 'svg'
    ? doc.documentElement
    : doc.querySelector('svg');
  const inheritedRootDefaults = extractTextStyleFromElement(svgRoot);
  const aggregated: GlobalTextStyle = {
    ...inheritedRootDefaults,
    ...textRuleDefaults,
  };

  return Object.keys(aggregated).length ? aggregated : null;
};

export const applyGlobalTextStyleToNodes = (root: Element, defaults?: GlobalTextStyle | null): void => {
  if (!defaults) return;
  const textNodes = Array.from(root.querySelectorAll('text'));
  textNodes.forEach((node) => {
    if (defaults.fontSize !== undefined && !node.hasAttribute('font-size')) {
      node.setAttribute('font-size', String(defaults.fontSize));
    }
    if (defaults.fontFamily && !node.hasAttribute('font-family')) {
      node.setAttribute('font-family', defaults.fontFamily);
    }
    if (defaults.fontWeight && !node.hasAttribute('font-weight')) {
      node.setAttribute('font-weight', defaults.fontWeight);
    }
    if (defaults.fontStyle && !node.hasAttribute('font-style')) {
      node.setAttribute('font-style', defaults.fontStyle);
    }
  });
};

export const resolveTextStyle = (element: Element, defaults?: GlobalTextStyle) => {
  const sizeAttr = element.getAttribute('font-size');
  const familyAttr = element.getAttribute('font-family');
  const weightAttr = element.getAttribute('font-weight');
  const styleAttr = element.getAttribute('font-style');
  const baseSize = resolveInheritedFontSize(element.parentElement, defaults);

  return {
    fontSize: parseFontSize(sizeAttr, baseSize) ?? baseSize,
    fontFamily: familyAttr || defaults?.fontFamily || 'Times New Roman, Times, serif',
    fontWeight: weightAttr || defaults?.fontWeight || 'normal',
    fontStyle: sanitizeFontStyle(styleAttr ?? defaults?.fontStyle ?? 'normal'),
  };
};
