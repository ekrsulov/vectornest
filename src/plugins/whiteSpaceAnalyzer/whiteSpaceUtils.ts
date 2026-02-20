import type { CanvasElement, SubPath, Command } from '../../types';
import type { WhiteSpaceMetrics } from './slice';

function getElementBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } | null {
  if (el.type === 'path') {
    const allPts = (el.data.subPaths as SubPath[]).flatMap((sp: SubPath) => (sp as Command[]).flatMap((cmd: Command) => {
      if (cmd.type === 'Z') return [];
      const pts = [cmd.position];
      if (cmd.type === 'C') {
        pts.push(cmd.controlPoint1, cmd.controlPoint2);
      }
      return pts;
    }));
    if (allPts.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of allPts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  return null;
}

export function analyzeWhiteSpace(
  elements: CanvasElement[],
  canvasW: number,
  canvasH: number,
  autoDetect: boolean
): WhiteSpaceMetrics {
  const boundsArr: { x: number; y: number; w: number; h: number }[] = [];
  for (const el of elements) {
    const b = getElementBounds(el);
    if (b && b.w > 0 && b.h > 0) boundsArr.push(b);
  }

  let effectiveW = canvasW;
  let effectiveH = canvasH;
  let offsetX = 0;
  let offsetY = 0;

  if (autoDetect && boundsArr.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of boundsArr) {
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.w > maxX) maxX = b.x + b.w;
      if (b.y + b.h > maxY) maxY = b.y + b.h;
    }
    const margin = Math.max((maxX - minX), (maxY - minY)) * 0.1;
    offsetX = minX - margin;
    offsetY = minY - margin;
    effectiveW = (maxX - minX) + margin * 2;
    effectiveH = (maxY - minY) + margin * 2;
  }

  const canvasArea = effectiveW * effectiveH;
  if (canvasArea === 0 || boundsArr.length === 0) {
    return {
      canvasArea,
      elementsArea: 0,
      whiteSpaceArea: canvasArea,
      whiteSpacePercent: 100,
      utilization: 0,
      density: 0,
      balanceH: 50,
      balanceV: 50,
    };
  }

  // Approximate elements area as sum of bounding box areas (not pixel-perfect)
  let totalElArea = 0;
  for (const b of boundsArr) {
    totalElArea += b.w * b.h;
  }
  // Cap at canvas area (overlapping elements can exceed)
  const elementsArea = Math.min(totalElArea, canvasArea);
  const whiteSpaceArea = canvasArea - elementsArea;
  const whiteSpacePercent = (whiteSpaceArea / canvasArea) * 100;
  const utilization = (elementsArea / canvasArea) * 100;

  // Density = elements per 1000 sq units
  const density = (boundsArr.length / canvasArea) * 10000;

  // Balance: compute center of mass of element bounds relative to canvas center
  let sumCX = 0, sumCY = 0, sumA = 0;
  for (const b of boundsArr) {
    const area = b.w * b.h;
    sumCX += (b.x + b.w / 2 - offsetX) * area;
    sumCY += (b.y + b.h / 2 - offsetY) * area;
    sumA += area;
  }

  const comX = sumA > 0 ? sumCX / sumA : effectiveW / 2;
  const comY = sumA > 0 ? sumCY / sumA : effectiveH / 2;
  const balanceH = (comX / effectiveW) * 100;
  const balanceV = (comY / effectiveH) * 100;

  return {
    canvasArea: Math.round(canvasArea),
    elementsArea: Math.round(elementsArea),
    whiteSpaceArea: Math.round(whiteSpaceArea),
    whiteSpacePercent: Math.round(whiteSpacePercent * 10) / 10,
    utilization: Math.round(utilization * 10) / 10,
    density: Math.round(density * 100) / 100,
    balanceH: Math.round(balanceH * 10) / 10,
    balanceV: Math.round(balanceV * 10) / 10,
  };
}
