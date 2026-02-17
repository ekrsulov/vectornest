import type { Matrix, ImportedElement } from '../../utils/svgImportUtils';
import { extractStyleAttributes } from '../../utils/svgImportUtils';
import type { NativeTextElement } from './types';
import { parseFontSize, resolveTextStyle } from './textStyleUtils';

type AffineMatrix = [number, number, number, number, number, number];

const convertTransformToMatrix = (t: Matrix): AffineMatrix => [t.a, t.b, t.c, t.d, t.e, t.f];

export function shapeToNativeText(
    element: Element,
    transform: Matrix
): ImportedElement | null {
    if (element.tagName.toLowerCase() !== 'text') return null;

    const style = extractStyleAttributes(element);
    const filterId = (style as { filterId?: string }).filterId;
    const x = parseFloat(element.getAttribute('x') || '0');
    const y = parseFloat(element.getAttribute('y') || '0');
    const fontSizeAttr = element.getAttribute('font-size');
    const { fontSize: resolvedSize, fontFamily, fontWeight, fontStyle } = resolveTextStyle(element);
    const fontSize = parseFontSize(fontSizeAttr, resolvedSize ?? 16) ?? resolvedSize ?? 16;
    const textAnchor = (element.getAttribute('text-anchor') as 'start' | 'middle' | 'end' | null) || 'start';
    const dominantBaseline = (element.getAttribute('dominant-baseline') as 'alphabetic' | 'middle' | 'hanging' | 'ideographic' | null) ?? undefined;
    const lengthAdjustAttr = element.getAttribute('lengthAdjust') as 'spacing' | 'spacingAndGlyphs' | null;
    const textLengthAttr = element.getAttribute('textLength');
    const lengthAdjust = lengthAdjustAttr === 'spacing' || lengthAdjustAttr === 'spacingAndGlyphs' ? lengthAdjustAttr : undefined;
    const textLength = textLengthAttr !== null ? parseFloat(textLengthAttr) : undefined;

    // Parse rotate attribute (per-glyph rotation values)
    const rotateAttr = element.getAttribute('rotate');
    const rotate = rotateAttr ? rotateAttr.trim().split(/[\s,]+/).map(v => parseFloat(v)).filter(v => Number.isFinite(v)) : undefined;

    // Parse direction, unicode-bidi and word-spacing attributes
    const direction = element.getAttribute('direction') as 'ltr' | 'rtl' | null ?? undefined;
    const unicodeBidi = element.getAttribute('unicode-bidi') as NativeTextElement['data']['unicodeBidi'] | null ?? undefined;
    const wordSpacingAttr = element.getAttribute('word-spacing');
    const wordSpacing = wordSpacingAttr !== null ? parseFloat(wordSpacingAttr) : undefined;

    const normalizeTextContent = (value: string): string => {
        const lines = value.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
        return lines.join('\n');
    };

    const textContent = normalizeTextContent(element.textContent ?? '');
    const textDecoration = (element.getAttribute('text-decoration') as 'none' | 'underline' | 'line-through' | null) ?? 'none';
    const letterSpacingAttr = element.getAttribute('letter-spacing');
    const letterSpacing = letterSpacingAttr !== null ? parseFloat(letterSpacingAttr) : undefined;
    const textTransform = (element.getAttribute('text-transform') as 'none' | 'uppercase' | 'lowercase' | 'capitalize' | null) ?? 'none';
    const writingModeAttr = element.getAttribute('writing-mode') ?? (element as SVGElement).style?.getPropertyValue?.('writing-mode') ?? undefined;
    const writingMode = writingModeAttr ? writingModeAttr.trim() as NativeTextElement['data']['writingMode'] : undefined;
    const resolvedFillColor = style.fillColor ?? '#000000';

    const tspanNodes = Array.from(element.querySelectorAll('tspan'));
    const textPathNode = element.querySelector('textPath');
    let spans: Array<NonNullable<NativeTextElement['data']['spans']>[number]> = [];
    let richText: string | undefined;

    if (tspanNodes.length > 0) {
        let line = 0;
        const dxQueue: number[] = [];

        spans = tspanNodes.map((node, idx) => {
            if (idx > 0 && (node.getAttribute('dy') !== null || node.getAttribute('x') !== null)) {
                line += 1;
            }
            const dxAttr = node.getAttribute('dx') ?? (node as SVGElement).style?.getPropertyValue?.('dx') ?? undefined;
            const parsedDx = (dxAttr ?? '').trim();
            if (parsedDx.length) {
                const list = parsedDx.split(/[\s,]+/).map((v) => parseFloat(v)).filter((v) => Number.isFinite(v));
                if (list.length) {
                    dxQueue.push(...list);
                }
            }
            const rawText = node.textContent ?? '';
            const textContent = rawText.trim();
            const glyphCount = Math.max(1, textContent.length);
            const consumedDx: number[] = [];
            for (let i = 0; i < glyphCount; i += 1) {
                if (!dxQueue.length) break;
                const val = dxQueue.shift();
                if (val !== undefined) consumedDx.push(val);
            }
            const dx = consumedDx.length ? consumedDx.join(' ') : undefined;
            return {
                text: textContent,
                line,
                fontWeight: node.getAttribute('font-weight') ?? undefined,
                fontStyle: (node.getAttribute('font-style') as 'normal' | 'italic' | null) ?? undefined,
                fontSize: parseFontSize(node.getAttribute('font-size'), fontSize),
                textDecoration: (node.getAttribute('text-decoration') as 'none' | 'underline' | 'line-through' | null) ?? undefined,
                fillColor: node.getAttribute('fill') ?? undefined,
                dx,
            };
        });

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
            const startOffsetAttr = textPathNode.getAttribute('startOffset');
            const startOffsetValue = startOffsetAttr
                ? parseFloat(startOffsetAttr.replace('%', ''))
                : undefined;
            // Store as a path element with textPath data for later resolution
            const tpText = textPathNode.textContent ?? textContent;
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
                        textAnchor,
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
