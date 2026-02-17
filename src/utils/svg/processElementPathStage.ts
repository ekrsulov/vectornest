import { parsePathD } from '../pathParserUtils';
import type { Command, PathData, SubPath } from '../../types';
import { logger } from '../logger';
import { shapeToPath } from '../import/shapeToPath';
import { normalizeMarkerId } from '../markerUtils';
import { normalizeToMLCZ as normalizePathToMLCZ } from './normalizer';
import { extractStyleAttributes } from './styleAttributes';
import { shouldPreserveTransform } from './transformPreservation';
import { transformPath } from './transform';
import type { Matrix } from './transform';
import type { ImportedElement } from './importTypes';
import type { ImportContext } from './processElementTypes';
import { createIdentityMatrix, toMatrixTuple, sanitizeDisplayStyleAttributes } from './processElementCommon';

const normalizeToMLCZ = (pathData: string): string => {
  try {
    return normalizePathToMLCZ(pathData);
  } catch (error) {
    logger.error('Error normalizing path:', error);
    return pathData;
  }
};

type PathStageArgs = {
  element: Element;
  tagName: string;
  combinedTransform: Matrix;
  context: ImportContext;
};

export const processPathStage = ({
  element,
  tagName,
  combinedTransform,
  context,
}: PathStageArgs): ImportedElement | null => {
  let pathData: string | null = null;

  if (tagName === 'path') {
    pathData = element.getAttribute('d');
    if (!pathData) {
      const animateD = element.querySelector('animate[attributeName="d"]');
      if (animateD) {
        const values = animateD.getAttribute('values');
        const from = animateD.getAttribute('from');
        const to = animateD.getAttribute('to');
        const candidate =
          values?.split(';').map((v) => v.trim()).filter(Boolean)[0] || from || to;
        if (candidate) {
          pathData = candidate;
          element.setAttribute('d', candidate);
        }
      }
    }
  } else {
    pathData = shapeToPath(element);
  }

  if (!pathData) {
    return null;
  }

  const styleAttrsRaw = extractStyleAttributes(element, context.inheritedStyle);
  const { hasDisplayNone, sanitizedStyleAttrs } = sanitizeDisplayStyleAttributes(styleAttrsRaw);
  const styleAttrs = sanitizedStyleAttrs;

  const preserveTransform = shouldPreserveTransform(
    element,
    context.doc,
    context.hasAnimatedAncestor
  );

  const isIdentity =
    combinedTransform.a === 1 &&
    combinedTransform.b === 0 &&
    combinedTransform.c === 0 &&
    combinedTransform.d === 1 &&
    combinedTransform.e === 0 &&
    combinedTransform.f === 0;

  const transformToApply = preserveTransform ? createIdentityMatrix() : combinedTransform;
  const storedTransformMatrix = preserveTransform && !isIdentity
    ? toMatrixTuple(combinedTransform)
    : undefined;

  const transformedPath = transformPath(pathData, transformToApply);
  const normalizedPath = normalizeToMLCZ(transformedPath);
  const commands = parsePathD(normalizedPath);

  const subPaths: SubPath[] = [];
  let currentSubPath: Command[] = [];

  commands.forEach((cmd) => {
    if (cmd.type === 'M') {
      if (currentSubPath.length > 0) {
        subPaths.push(currentSubPath);
      }
      currentSubPath = [cmd];
    } else {
      currentSubPath.push(cmd);
    }
  });

  if (currentSubPath.length > 0) {
    subPaths.push(currentSubPath);
  }

  if (subPaths.length === 0) {
    return null;
  }

  const defaultFillColor = styleAttrs.fillColor ?? '#000000';
  const defaultStrokeColor = styleAttrs.strokeColor ?? 'none';

  const markerStartAttr = normalizeMarkerId(element.getAttribute('marker-start'));
  const markerMidAttr = normalizeMarkerId(element.getAttribute('marker-mid'));
  const markerEndAttr = normalizeMarkerId(element.getAttribute('marker-end'));
  const normalizedMarkerStart =
    normalizeMarkerId((styleAttrs as { markerStart?: string }).markerStart) ?? markerStartAttr;
  const normalizedMarkerMid =
    normalizeMarkerId((styleAttrs as { markerMid?: string }).markerMid) ?? markerMidAttr;
  const normalizedMarkerEnd =
    normalizeMarkerId((styleAttrs as { markerEnd?: string }).markerEnd) ?? markerEndAttr;

  const pathDataObj: PathData = {
    subPaths,
    strokeWidth: styleAttrs.strokeWidth ?? 1,
    strokeColor: defaultStrokeColor,
    strokeOpacity: styleAttrs.strokeOpacity ?? 1,
    fillColor: defaultFillColor,
    fillOpacity: styleAttrs.fillOpacity ?? 1,
    strokeLinecap: styleAttrs.strokeLinecap,
    strokeLinejoin: styleAttrs.strokeLinejoin,
    fillRule: styleAttrs.fillRule,
    strokeDasharray: styleAttrs.strokeDasharray,
    sourceId: element.getAttribute('id') ?? undefined,
    filterId: (styleAttrs as { filterId?: string }).filterId,
    clipPathId: (styleAttrs as { clipPathId?: string; clipPathTemplateId?: string }).clipPathId,
    clipPathTemplateId: (styleAttrs as {
      clipPathId?: string;
      clipPathTemplateId?: string;
    }).clipPathTemplateId,
    markerStart: normalizedMarkerStart,
    markerMid: normalizedMarkerMid,
    markerEnd: normalizedMarkerEnd,
    maskId: (styleAttrs as { maskId?: string }).maskId,
    opacity: styleAttrs.opacity,
    transformMatrix: storedTransformMatrix,
  };

  if (styleAttrs.visibility) {
    pathDataObj.visibility = styleAttrs.visibility;
  }
  if (styleAttrs.display) {
    pathDataObj.display = styleAttrs.display;
  }
  if (styleAttrs.strokeDashoffset !== undefined) {
    pathDataObj.strokeDashoffset = styleAttrs.strokeDashoffset;
  }
  if (styleAttrs.strokeMiterlimit !== undefined) {
    pathDataObj.strokeMiterlimit = styleAttrs.strokeMiterlimit;
  }
  if (styleAttrs.vectorEffect) {
    pathDataObj.vectorEffect = styleAttrs.vectorEffect;
  }
  if (styleAttrs.shapeRendering) {
    pathDataObj.shapeRendering = styleAttrs.shapeRendering;
  }
  if ((styleAttrs as { mixBlendMode?: string }).mixBlendMode) {
    pathDataObj.mixBlendMode = (styleAttrs as { mixBlendMode?: string }).mixBlendMode;
  }
  if ((styleAttrs as { isolation?: 'auto' | 'isolate' }).isolation) {
    pathDataObj.isolation = (styleAttrs as { isolation?: 'auto' | 'isolate' }).isolation;
  }
  if (hasDisplayNone) {
    (pathDataObj as { importedHidden?: boolean }).importedHidden = true;
  }

  if (context.inDefs) {
    pathDataObj.isTextPathRef = true;
    pathDataObj.isDefinition = true;
    pathDataObj.display = 'none';
  }

  return {
    type: 'path',
    data: pathDataObj,
  };
};
