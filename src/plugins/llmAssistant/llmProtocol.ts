import { sanitizeSvgContent, type SanitizeSvgOptions } from '../../utils/sanitizeSvgContent';

export type LlmAssistantMode = 'editSelection' | 'insertNew';

export type LlmAssistantSvgParseResult =
  | { ok: true; svg: string }
  | { ok: false; error: string };

export const EMPTY_SVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';

const extractFromCodeFences = (raw: string): string | null => {
  const matches = Array.from(raw.matchAll(/```(?:svg|xml)?\s*([\s\S]*?)```/gi)).map((m) => (m[1] ?? '').trim());
  const nonEmpty = matches.filter((m) => m.length > 0);
  if (nonEmpty.length === 0) return null;

  const best =
    nonEmpty.find((m) => m.toLowerCase().includes('<svg')) ??
    nonEmpty.find((m) => /<(path|g|rect|circle|ellipse|line|polyline|polygon)\b/i.test(m)) ??
    nonEmpty[0];

  return best ?? null;
};

const wrapSvgFragment = (fragment: string): string => `<svg xmlns="http://www.w3.org/2000/svg">${fragment}</svg>`;

export function extractSvgFromLlmResponse(raw: string): LlmAssistantSvgParseResult {
  const trimmedRaw = raw.trim();
  if (!trimmedRaw) return { ok: false, error: 'Empty response.' };

  const fenced = extractFromCodeFences(trimmedRaw);
  const candidate = (fenced ?? trimmedRaw).trim();
  if (!candidate) return { ok: false, error: 'Empty response.' };

  const lower = candidate.toLowerCase();
  const start = lower.indexOf('<svg');
  if (start >= 0) {
    const end = lower.lastIndexOf('</svg>');
    if (end < 0) {
      return { ok: false, error: 'Response contains <svg> but is missing </svg>.' };
    }
    return { ok: true, svg: candidate.slice(start, end + '</svg>'.length) };
  }

  const hasAnyTag = candidate.includes('<') && candidate.includes('>');
  if (!hasAnyTag) {
    return { ok: false, error: 'Response does not contain SVG markup.' };
  }

  const firstTag = candidate.indexOf('<');
  const lastTag = candidate.lastIndexOf('>');
  const fragment = candidate.slice(firstTag, lastTag + 1).trim();
  if (!fragment) return { ok: false, error: 'Response does not contain SVG markup.' };

  return { ok: true, svg: wrapSvgFragment(fragment) };
}

export function extractAndSanitizeSvgFromLlmResponse(
  raw: string,
  sanitizeOptions: SanitizeSvgOptions
): LlmAssistantSvgParseResult {
  const extracted = extractSvgFromLlmResponse(raw);
  if (!extracted.ok) return extracted;
  const sanitized = sanitizeSvgContent(extracted.svg, sanitizeOptions);
  return { ok: true, svg: sanitized };
}

export function stripThinkFromLlmResponse(raw: string): { content: string; think: string | null } {
  if (!raw.includes('<think>')) return { content: raw, think: null };

  const matches = Array.from(raw.matchAll(/<think>([\s\S]*?)<\/think>/gi));
  const think = matches.length > 0 ? (matches[matches.length - 1][1] ?? '').trim() : null;
  const content = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return { content, think: think && think.length > 0 ? think : null };
}
