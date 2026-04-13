import type { Matrix, ImportedElement } from '../../utils/svgImportUtils';
import { extractStyleAttributes } from '../../utils/svgImportUtils';
import type { NativeTextElement } from './types';
import { parseFontSize, resolveTextStyle } from './textStyleUtils';
import { resolveCurrentColorValue } from '../../utils/svg/styleAttributes';

type AffineMatrix = [number, number, number, number, number, number];

const convertTransformToMatrix = (t: Matrix): AffineMatrix => [t.a, t.b, t.c, t.d, t.e, t.f];

export function shapeToNativeText(
    element: Element,
    transform: Matrix
): ImportedElement | null {
    if (element.tagName.toLowerCase() !== 'text') return null;

    const style = extractStyleAttributes(element);
    const filterId = (style as { filterId?: string }).filterId;

    // Helper to read from element attributes OR inline style
    const styleProps: Record<string, string> = {};
    const styleAttrStr = element.getAttribute('style');
    if (styleAttrStr) {
        styleAttrStr.split(';').forEach((prop) => {
            const colonIdx = prop.indexOf(':');
            if (colonIdx === -1) return;
            const key = prop.slice(0, colonIdx).trim();
            const value = prop.slice(colonIdx + 1).trim();
            if (key && value) styleProps[key] = value;
        });
    }
    const getVal = (attrName: string, styleName?: string): string | null =>
        element.getAttribute(attrName) ?? styleProps[styleName ?? attrName] ?? null;

    // Fall back to first tspan's x/y when the text element doesn't have them
    const firstTspan = element.querySelector('tspan');
    const xAttrVal = getVal('x') ?? firstTspan?.getAttribute('x');
    const yAttrVal = getVal('y') ?? firstTspan?.getAttribute('y');
    const x = parseFloat(xAttrVal || '0');
    const y = parseFloat(yAttrVal || '0');
    const fontSizeAttr = getVal('font-size');
    const { fontSize: resolvedSize, fontFamily, fontWeight, fontStyle } = resolveTextStyle(element);
    const fontSize = parseFontSize(fontSizeAttr, resolvedSize ?? 16) ?? resolvedSize ?? 16;
    const textAnchor = (getVal('text-anchor') as 'start' | 'middle' | 'end' | null) || 'start';
    const dominantBaseline = (getVal('dominant-baseline') as 'alphabetic' | 'middle' | 'hanging' | 'ideographic' | null) ?? undefined;
    const lengthAdjustAttr = getVal('lengthAdjust') as 'spacing' | 'spacingAndGlyphs' | null;
    const textLengthAttr = getVal('textLength');
    const lengthAdjust = lengthAdjustAttr === 'spacing' || lengthAdjustAttr === 'spacingAndGlyphs' ? lengthAdjustAttr : undefined;
    const textLength = textLengthAttr !== null ? parseFloat(textLengthAttr!) : undefined;

    // Parse rotate attribute (per-glyph rotation values)
    const rotateAttr = getVal('rotate');
    const rotate = rotateAttr ? rotateAttr.trim().split(/[\s,]+/).map(v => parseFloat(v)).filter(v => Number.isFinite(v)) : undefined;

    // Parse direction, unicode-bidi and word-spacing attributes
    const direction = getVal('direction') as 'ltr' | 'rtl' | null ?? undefined;
    const unicodeBidi = getVal('unicode-bidi') as NativeTextElement['data']['unicodeBidi'] | null ?? undefined;
    const wordSpacingAttr = getVal('word-spacing');
    const wordSpacing = wordSpacingAttr !== null ? parseFloat(wordSpacingAttr!) : undefined;

    const normalizeTextContent = (value: string): string => {
        const lines = value.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
        return lines.join('\n');
    };

    const normalizeInlineTextContent = (value: string): string => value.replace(/\s+/g, ' ');
    const normalizeInlineTextSegment = (value: string, preserveLeading: boolean): string => {
        const collapsed = normalizeInlineTextContent(value);
        const trimmed = collapsed.trim();
        if (!trimmed) {
            return '';
        }

        const leadingSpace = preserveLeading && /^\s/.test(collapsed) ? ' ' : '';
        const trailingSpace = /\s$/.test(collapsed) ? ' ' : '';
        return `${leadingSpace}${trimmed}${trailingSpace}`;
    };
    const resolveSpanFillColor = (spanElement: Element): string | undefined =>
        resolveCurrentColorValue(spanElement, spanElement.getAttribute('fill'));

    const textContent = normalizeTextContent(element.textContent ?? '');
    const textDecoration = (getVal('text-decoration') as 'none' | 'underline' | 'line-through' | null) ?? 'none';
    const letterSpacingAttr = getVal('letter-spacing');
    const letterSpacing = letterSpacingAttr !== null ? parseFloat(letterSpacingAttr!) : undefined;
    const textTransform = (getVal('text-transform') as 'none' | 'uppercase' | 'lowercase' | 'capitalize' | null) ?? 'none';
    const writingModeAttr = getVal('writing-mode');
    const writingMode = writingModeAttr ? writingModeAttr.trim() as NativeTextElement['data']['writingMode'] : undefined;
    const resolvedFillColor = style.fillColor ?? '#000000';

    const tspanNodes = Array.from(element.querySelectorAll('tspan'));
    const textPathNode = element.querySelector('textPath');
    let spans: Array<NonNullable<NativeTextElement['data']['spans']>[number]> = [];
    let richText: string | undefined;

    if (textPathNode) {
        const textPathChildren = Array.from(textPathNode.childNodes);
        spans = textPathChildren.flatMap((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = normalizeInlineTextContent(node.textContent ?? '');
                if (!text.trim()) {
                    return [];
                }

                return [{
                    text,
                    line: 0,
                }];
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return [];
            }

            const child = node as Element;
            if (child.tagName.toLowerCase() !== 'tspan') {
                const text = normalizeInlineTextContent(child.textContent ?? '');
                if (!text.trim()) {
                    return [];
                }

                return [{
                    text,
                    line: 0,
                }];
            }

            const text = normalizeInlineTextContent(child.textContent ?? '');
            if (!text.trim()) {
                return [];
            }

            return [{
                text,
                line: 0,
                fontWeight: child.getAttribute('font-weight') ?? undefined,
                fontStyle: (child.getAttribute('font-style') as 'normal' | 'italic' | null) ?? undefined,
                fontSize: parseFontSize(child.getAttribute('font-size'), fontSize),
                textDecoration: (child.getAttribute('text-decoration') as 'none' | 'underline' | 'line-through' | null) ?? undefined,
                fillColor: resolveSpanFillColor(child),
                dx: child.getAttribute('dx') ?? undefined,
                dy: child.getAttribute('dy') ?? undefined,
                rotate: child.getAttribute('rotate') ?? undefined,
            }];
        });

        if (spans.length > 0) {
            richText = spans.map((span) => {
                const styles = [
                    span.fontWeight ? `font-weight:${span.fontWeight}` : null,
                    span.fontStyle ? `font-style:${span.fontStyle}` : null,
                    span.textDecoration ? `text-decoration:${span.textDecoration}` : null,
                    span.fillColor ? `color:${span.fillColor}` : null,
                ].filter(Boolean).join(';');

                return styles ? `<span style="${styles}">${span.text}</span>` : span.text;
            }).join('');
        }
    }

    if (!textPathNode && tspanNodes.length > 0) {
        let line = 0;
        const dxQueue: number[] = [];
        const dyQueue: number[] = [];
        const rotateQueue: number[] = [];

        const parsedSpans: Array<NonNullable<NativeTextElement['data']['spans']>[number]> = [];
        let tspanIndex = 0;

        Array.from(element.childNodes).forEach((childNode) => {
            if (childNode.nodeType === Node.TEXT_NODE) {
                const text = normalizeInlineTextSegment(childNode.textContent ?? '', parsedSpans.length > 0);
                if (!text.trim()) {
                    return;
                }

                parsedSpans.push({
                    text,
                    line,
                });
                return;
            }

            if (childNode.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            const node = childNode as Element;
            if (node.tagName.toLowerCase() !== 'tspan') {
                const text = normalizeInlineTextSegment(node.textContent ?? '', parsedSpans.length > 0);
                if (!text.trim()) {
                    return;
                }

                parsedSpans.push({
                    text,
                    line,
                });
                return;
            }

            const hasDy = node.getAttribute('dy') !== null;
            const hasX = node.getAttribute('x') !== null;
            // Detect line breaks: only increment line when dy/x is present AND
            // no per-glyph dy values exist (per-glyph dy means glyph positioning, not line breaks)
            const dyAttr = node.getAttribute('dy') ?? (node as SVGElement).style?.getPropertyValue?.('dy') ?? undefined;
            const parsedDy = (dyAttr ?? '').trim();
            const dyValues = parsedDy.length ? parsedDy.split(/[\s,]+/).map((v) => parseFloat(v)).filter((v) => Number.isFinite(v)) : [];
            const isPerGlyphDy = dyValues.length > 1;

            if (tspanIndex > 0 && (hasDy || hasX) && !isPerGlyphDy) {
                line += 1;
            }

            // Parse dx
            const dxAttr = node.getAttribute('dx') ?? (node as SVGElement).style?.getPropertyValue?.('dx') ?? undefined;
            const parsedDx = (dxAttr ?? '').trim();
            if (parsedDx.length) {
                const list = parsedDx.split(/[\s,]+/).map((v) => parseFloat(v)).filter((v) => Number.isFinite(v));
                if (list.length) {
                    dxQueue.push(...list);
                }
            }

            // Parse dy (only per-glyph values, not single-value line breaks)
            if (isPerGlyphDy) {
                dyQueue.push(...dyValues);
            }

            // Parse rotate (per-glyph values)
            const rotateAttrTspan = node.getAttribute('rotate');
            if (rotateAttrTspan) {
                const rotateValues = rotateAttrTspan.trim().split(/[\s,]+/).map((v) => parseFloat(v)).filter((v) => Number.isFinite(v));
                if (rotateValues.length) {
                    rotateQueue.push(...rotateValues);
                }
            }

            const rawText = node.textContent ?? '';
            const textContent = normalizeInlineTextSegment(rawText, parsedSpans.length > 0);
            if (!textContent.trim()) {
                return;
            }
            const glyphCount = Math.max(1, textContent.length);

            // Consume dx
            const consumedDx: number[] = [];
            for (let i = 0; i < glyphCount; i += 1) {
                if (!dxQueue.length) break;
                const val = dxQueue.shift();
                if (val !== undefined) consumedDx.push(val);
            }
            const dx = consumedDx.length ? consumedDx.join(' ') : undefined;

            // Consume dy
            const consumedDy: number[] = [];
            for (let i = 0; i < glyphCount; i += 1) {
                if (!dyQueue.length) break;
                const val = dyQueue.shift();
                if (val !== undefined) consumedDy.push(val);
            }
            const dy = consumedDy.length ? consumedDy.join(' ') : undefined;

            // Consume rotate
            const consumedRotate: number[] = [];
            for (let i = 0; i < glyphCount; i += 1) {
                if (!rotateQueue.length) break;
                const val = rotateQueue.shift();
                if (val !== undefined) consumedRotate.push(val);
            }
            const spanRotate = consumedRotate.length ? consumedRotate.join(' ') : undefined;

            parsedSpans.push({
                text: textContent,
                line,
                fontWeight: node.getAttribute('font-weight') ?? undefined,
                fontStyle: (node.getAttribute('font-style') as 'normal' | 'italic' | null) ?? undefined,
                fontSize: parseFontSize(node.getAttribute('font-size'), fontSize),
                textDecoration: (node.getAttribute('text-decoration') as 'none' | 'underline' | 'line-through' | null) ?? undefined,
                fillColor: resolveSpanFillColor(node),
                dx,
                dy,
                rotate: spanRotate,
            });

            tspanIndex += 1;
        });

        spans = parsedSpans;

        richText = spans.map((span, idx) => {
            const styles = [
                span.fontWeight ? `font-weight:${span.fontWeight}` : null,
                span.fontStyle ? `font-style:${span.fontStyle}` : null,
                span.textDecoration ? `text-decoration:${span.textDecoration}` : null,
                span.fillColor ? `color:${span.fillColor}` : null,
            ].filter(Boolean).join(';');
            const body = styles ? `<span style="${styles}">${span.text}</span>` : span.text;
            if (idx > 0 && span.line !== spans[idx - 1]?.line) {
                return `<br>${body}`;
            }
            return body;
        }).join('');
    }

    const matrixArr: AffineMatrix = convertTransformToMatrix(transform);

    // If this is a textPath, map it to a path element (using PathElement-like structure for Import)
    if (textPathNode) {
        const href = textPathNode.getAttribute('href') || textPathNode.getAttribute('xlink:href');
        if (href && href.startsWith('#')) {
            const method = (textPathNode.getAttribute('method') as 'align' | 'stretch' | null) ?? undefined;
            const spacing = (textPathNode.getAttribute('spacing') as 'auto' | 'exact' | null) ?? undefined;
            const textPathTextAnchor = (textPathNode.getAttribute('text-anchor') as 'start' | 'middle' | 'end' | null) ?? textAnchor;
            const startOffsetAttr = textPathNode.getAttribute('startOffset');
            const startOffsetValue = startOffsetAttr
                ? parseFloat(startOffsetAttr.replace('%', ''))
                : undefined;
            // Store as a path element with textPath data for later resolution
            const tpText = spans.length > 0
                ? spans.map((span) => span.text).join('')
                : normalizeInlineTextContent(textPathNode.textContent ?? textContent);
            const tpLengthAdjustAttr = textPathNode.getAttribute('lengthAdjust') as 'spacing' | 'spacingAndGlyphs' | null;
            const tpTextLengthAttr = textPathNode.getAttribute('textLength');
            const tpLengthAdjust = tpLengthAdjustAttr === 'spacing' || tpLengthAdjustAttr === 'spacingAndGlyphs' ? tpLengthAdjustAttr : lengthAdjust;
            const tpTextLength = tpTextLengthAttr !== null ? parseFloat(tpTextLengthAttr) : textLength;
            return {
                type: 'path',
                data: {
                    subPaths: [],
                    strokeWidth: style.strokeWidth ?? 1,
                    strokeColor: style.strokeColor ?? 'none',
                    strokeOpacity: style.strokeOpacity ?? 1,
                    fillColor: resolvedFillColor,
                    fillOpacity: style.fillOpacity ?? 1,
                    textPath: {
                        text: tpText,
                        richText,
                        spans: spans && spans.length > 0 ? spans : undefined,
                        fontSize,
                        fontFamily,
                        fontWeight,
                        fontStyle,
                        textDecoration,
                        letterSpacing,
                        textAnchor: textPathTextAnchor,
                        startOffset: Number.isFinite(startOffsetValue) ? startOffsetValue : undefined,
                        method,
                        spacing,
                        lengthAdjust: tpLengthAdjust,
                        textLength: tpTextLength,
                        fillColor: resolvedFillColor,
                        fillOpacity: style.fillOpacity ?? undefined,
                        strokeColor: style.strokeColor ?? undefined,
                        strokeWidth: style.strokeWidth ?? undefined,
                        strokeOpacity: style.strokeOpacity ?? undefined,
                        dominantBaseline,
                        filterId,
                        maskId: (style as { maskId?: string }).maskId,
                        opacity: (style as { opacity?: number }).opacity,
                    },
                    sourceId: element.getAttribute('id') ?? undefined,
                    filterId,
                    maskId: (style as { maskId?: string }).maskId,
                    opacity: (style as { opacity?: number }).opacity,
                },
            } as ImportedElement;
        }
    }

    return {
        type: 'nativeText',
        data: {
            x,
            y,
            text: spans && spans.length > 0
                ? spans.reduce((acc, span, idx) => {
                    if (idx > 0 && span.line !== spans[idx - 1]?.line) {
                        return `${acc}\n${span.text}`;
                    }
                    return `${acc}${span.text}`;
                }, '')
                : textContent,
            richText,
            spans: spans && spans.length > 0 ? spans : undefined,
            fontSize,
            fontFamily,
            fontWeight,
            fontStyle,
            textAnchor,
            textDecoration,
            dominantBaseline,
            letterSpacing,
            lengthAdjust,
            textLength,
            textTransform,
            writingMode,
            rotate: rotate && rotate.length > 0 ? rotate : undefined,
            direction,
            wordSpacing,
            unicodeBidi,
            fillColor: resolvedFillColor,
            fillOpacity: style.fillOpacity ?? 1,
            strokeColor: style.strokeColor ?? 'none',
            strokeWidth: style.strokeWidth ?? 0,
            strokeOpacity: style.strokeOpacity ?? 1,
            strokeLinecap: style.strokeLinecap,
            strokeLinejoin: style.strokeLinejoin,
            strokeDasharray: style.strokeDasharray,
            filterId,
            mixBlendMode: (style as { mixBlendMode?: string }).mixBlendMode,
            isolation: (style as { isolation?: 'auto' | 'isolate' }).isolation,
            clipPathId: (style as { clipPathId?: string; clipPathTemplateId?: string }).clipPathId,
            clipPathTemplateId: (style as { clipPathId?: string; clipPathTemplateId?: string }).clipPathTemplateId,
            maskId: (style as { maskId?: string }).maskId,
            opacity: (style as { opacity?: number }).opacity,
            transformMatrix: matrixArr,
            sourceId: element.getAttribute('id') ?? undefined,
        },
    } as ImportedElement;
}
