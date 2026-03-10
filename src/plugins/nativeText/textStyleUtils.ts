/**
 * Text style utilities for SVG text import
 */

interface GlobalTextStyle {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: 'normal' | 'italic';
}

const sanitizeFontStyle = (value?: string | null): 'normal' | 'italic' => {
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

const resolveInheritedFontSize = (element: Element | null, defaults?: GlobalTextStyle): number => {
    if (!element) return defaults?.fontSize ?? 16;
    const parentSize = resolveInheritedFontSize(element.parentElement, defaults);
    const ownSize = parseFontSize(element.getAttribute('font-size'), parentSize);
    return ownSize ?? parentSize;
};

export const resolveTextStyle = (element: Element, defaults?: GlobalTextStyle) => {
    // Read from both element attributes and inline style
    const styleProps: Record<string, string> = {};
    const styleStr = element.getAttribute('style');
    if (styleStr) {
        styleStr.split(';').forEach((prop) => {
            const colonIdx = prop.indexOf(':');
            if (colonIdx === -1) return;
            const key = prop.slice(0, colonIdx).trim();
            const value = prop.slice(colonIdx + 1).trim();
            if (key && value) styleProps[key] = value;
        });
    }
    const sizeAttr = element.getAttribute('font-size') ?? styleProps['font-size'] ?? null;
    const familyAttr = element.getAttribute('font-family') ?? styleProps['font-family'] ?? null;
    const weightAttr = element.getAttribute('font-weight') ?? styleProps['font-weight'] ?? null;
    const styleAttr = element.getAttribute('font-style') ?? styleProps['font-style'] ?? null;
    const baseSize = resolveInheritedFontSize(element.parentElement, defaults);

    return {
        fontSize: parseFontSize(sizeAttr, baseSize) ?? baseSize,
        fontFamily: familyAttr || defaults?.fontFamily || 'Times New Roman, Times, serif',
        fontWeight: weightAttr || defaults?.fontWeight || 'normal',
        fontStyle: sanitizeFontStyle(styleAttr ?? defaults?.fontStyle ?? 'normal'),
    };
};
