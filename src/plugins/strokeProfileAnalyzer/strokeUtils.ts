import type { CanvasElement } from '../../types';
import type { StrokeProfile } from './slice';

interface StrokeInfo {
  width: number;
  color: string;
  linecap: string;
  linejoin: string;
  dasharray: string;
}

function getStrokeInfo(el: CanvasElement): StrokeInfo | null {
  if (el.type !== 'path') return null;
  const data = el.data;
  if (!data) return null;

  const stroke = data.strokeColor ?? 'none';
  if (stroke === 'none' || stroke === '' || stroke === 'transparent') return null;

  return {
    width: typeof data.strokeWidth === 'number' ? data.strokeWidth : parseFloat(String(data.strokeWidth ?? '1')) || 1,
    color: stroke,
    linecap: String(data.strokeLinecap ?? 'butt'),
    linejoin: String(data.strokeLinejoin ?? 'miter'),
    dasharray: String(data.strokeDasharray ?? 'none'),
  };
}

function profileKey(info: StrokeInfo): string {
  return `${info.width}|${info.color.toLowerCase()}|${info.linecap}|${info.linejoin}|${info.dasharray}`;
}

export function analyzeStrokeProfiles(elements: CanvasElement[]): {
  profiles: StrokeProfile[];
  totalStroked: number;
  totalUnstroked: number;
  uniqueWidths: number;
  uniqueColors: number;
  consistencyScore: number;
} {
  const profileMap = new Map<string, { info: StrokeInfo; ids: string[] }>();
  let totalStroked = 0;
  let totalUnstroked = 0;

  for (const el of elements) {
    if (el.type === 'group') continue;

    const info = getStrokeInfo(el);
    if (!info) {
      totalUnstroked++;
      continue;
    }

    totalStroked++;
    const key = profileKey(info);
    const existing = profileMap.get(key);
    if (existing) {
      existing.ids.push(el.id);
    } else {
      profileMap.set(key, { info, ids: [el.id] });
    }
  }

  const profiles: StrokeProfile[] = Array.from(profileMap.values())
    .map(({ info, ids }) => ({
      width: info.width,
      color: info.color,
      linecap: info.linecap,
      linejoin: info.linejoin,
      dasharray: info.dasharray,
      elementCount: ids.length,
      elementIds: ids,
    }))
    .sort((a, b) => b.elementCount - a.elementCount);

  const uniqueWidths = new Set(profiles.map((p) => p.width)).size;
  const uniqueColors = new Set(profiles.map((p) => p.color.toLowerCase())).size;

  // Consistency score: how concentrated the usage is in the top profile
  let consistencyScore = 0;
  if (totalStroked > 0 && profiles.length > 0) {
    const topCount = profiles[0].elementCount;
    consistencyScore = Math.round((topCount / totalStroked) * 100);
  }

  return {
    profiles,
    totalStroked,
    totalUnstroked,
    uniqueWidths,
    uniqueColors,
    consistencyScore,
  };
}
