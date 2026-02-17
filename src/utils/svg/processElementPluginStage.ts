import type { PathData } from '../../types';
import { pluginManager } from '../pluginManager';
import { multiplyMatrices, parseTransform } from './transform';
import type { Matrix } from './transform';
import type { ImportedElement, ImportedPathElement } from './importTypes';
import type { ImportContext, TextPathAttachment } from './processElementTypes';
import { toMatrixTuple } from './processElementCommon';

type PluginStageArgs = {
  element: Element;
  tagName: string;
  parentTransform: Matrix;
  combinedTransform: Matrix;
  attachments: TextPathAttachment[];
  context: ImportContext;
};

export const processPluginStage = ({
  element,
  tagName,
  parentTransform,
  combinedTransform,
  attachments,
  context,
}: PluginStageArgs): ImportedElement[] | null => {
  const importers = pluginManager.getImporters();
  let importedElements: ImportedElement[] | null = null;

  for (const importerList of importers) {
    if (!importerList) continue;
    for (const importer of importerList) {
      const imported = importer(element, combinedTransform);
      if (imported) {
        importedElements = Array.isArray(imported)
          ? (imported as ImportedElement[])
          : ([imported] as ImportedElement[]);
        break;
      }
    }
    if (importedElements) break;
  }

  if (!importedElements) {
    return null;
  }

  if (tagName !== 'text') {
    return importedElements;
  }

  const textPathNode = element.querySelector('textPath');
  const href = textPathNode?.getAttribute('href') || textPathNode?.getAttribute('xlink:href');
  if (!href || !href.startsWith('#')) {
    return importedElements;
  }

  const targetId = href.slice(1);
  const pathWithText = importedElements.find(
    (el): el is ImportedPathElement =>
      el.type === 'path' && Boolean((el.data as PathData).textPath)
  );

  if (!pathWithText) {
    return importedElements;
  }

  const baseTextPath = pathWithText.data.textPath;
  if (!baseTextPath || !baseTextPath.text) {
    return importedElements.filter((el) => el !== pathWithText);
  }

  const startOffsetAttr = textPathNode?.getAttribute('startOffset');
  const startOffset = startOffsetAttr ? parseFloat(startOffsetAttr.replace('%', '')) : undefined;
  const inheritedMaskId = (context.inheritedStyle as { maskId?: string } | undefined)?.maskId;
  const inheritedOpacity = (context.inheritedStyle as { opacity?: number } | undefined)?.opacity;

  const effectiveTransform = (() => {
    const base = context.cumulativeTransform
      ? { ...context.cumulativeTransform }
      : { ...parentTransform };
    const elementMatrix = parseTransform(element.getAttribute('transform') || '');
    multiplyMatrices(base, elementMatrix);
    return base;
  })();

  const textPathData = {
    ...baseTextPath,
    startOffset: Number.isFinite(startOffset)
      ? startOffset
      : pathWithText.data.textPath?.startOffset,
    maskId: baseTextPath.maskId ?? inheritedMaskId,
    opacity: baseTextPath.opacity ?? inheritedOpacity,
    anchorGroupSourceIds:
      context.ancestorGroupSourceIds && context.ancestorGroupSourceIds.length
        ? [...context.ancestorGroupSourceIds]
        : undefined,
    transformMatrix: toMatrixTuple(effectiveTransform),
    href,
  };

  attachments.push({ targetId, textPath: textPathData });

  const proxyGroup: ImportedElement = {
    type: 'group',
    name: 'TextPath Reference',
    data: {
      ...pathWithText.data,
      textPath: textPathData,
      visibility: 'hidden',
    },
    children: [],
  };

  const idx = importedElements.indexOf(pathWithText);
  if (idx !== -1) {
    importedElements[idx] = proxyGroup;
  }

  return importedElements;
};
