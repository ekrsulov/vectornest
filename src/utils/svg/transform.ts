import { parsePath, absolutize, normalize } from 'path-data-parser';

export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY_MATRIX: Matrix = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
};

export function parseTransform(transformStr: string): Matrix {
  const matrix: Matrix = { ...IDENTITY_MATRIX };
  if (!transformStr) {
    return matrix;
  }

  const transforms = transformStr.match(/(\w+)\s*\(([^)]+)\)/g);
  if (!transforms) {
    return matrix;
  }

  const prependTransform = (next: Matrix): void => {
    multiplyMatrices(next, matrix);
    Object.assign(matrix, next);
  };

  for (let i = transforms.length - 1; i >= 0; i -= 1) {
    const transform = transforms[i];
    const match = transform.match(/(\w+)\s*\(([^)]+)\)/);
    if (!match) {
      continue;
    }

    const [, type, argsStr] = match;
    const args = argsStr.split(/[\s,]+/).map(parseFloat);

    switch (type) {
      case 'matrix': {
        const [a, b, c, d, e, f] = args;
        prependTransform({ a, b, c, d, e, f });
        break;
      }
      case 'translate': {
        const tx = args[0] || 0;
        const ty = args[1] || 0;
        prependTransform({ a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });
        break;
      }
      case 'scale': {
        const sx = args[0] || 1;
        const sy = args[1] !== undefined ? args[1] : sx;
        prependTransform({ a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });
        break;
      }
      case 'rotate': {
        const angle = ((args[0] || 0) * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        if (args.length > 1) {
          const cx = args[1];
          const cy = args[2];
          prependTransform({ a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy });
          prependTransform({ a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
          prependTransform({ a: 1, b: 0, c: 0, d: 1, e: cx, f: cy });
        } else {
          prependTransform({ a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
        }
        break;
      }
      case 'skewX': {
        const angle = ((args[0] || 0) * Math.PI) / 180;
        const tan = Math.tan(angle);
        prependTransform({ a: 1, b: 0, c: tan, d: 1, e: 0, f: 0 });
        break;
      }
      case 'skewY': {
        const angle = ((args[0] || 0) * Math.PI) / 180;
        const tan = Math.tan(angle);
        prependTransform({ a: 1, b: tan, c: 0, d: 1, e: 0, f: 0 });
        break;
      }
      default:
        break;
    }
  }

  return matrix;
}

export function multiplyMatrices(m1: Matrix, m2: Matrix): void {
  const result = {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
  Object.assign(m1, result);
}

export function transformPath(pathData: string, matrix: Matrix): string {
  const isIdentity =
    matrix.a === 1 &&
    matrix.b === 0 &&
    matrix.c === 0 &&
    matrix.d === 1 &&
    matrix.e === 0 &&
    matrix.f === 0;

  if (isIdentity) {
    return pathData;
  }

  const parsed = parsePath(pathData);
  const absolute = absolutize(parsed);
  const commands = normalize(absolute);

  const transformedCommands = commands.map((command) => {
    const data = [...command.data];

    if (command.key === 'M' || command.key === 'L') {
      const x = data[0];
      const y = data[1];
      data[0] = matrix.a * x + matrix.c * y + matrix.e;
      data[1] = matrix.b * x + matrix.d * y + matrix.f;
    } else if (command.key === 'C') {
      for (let i = 0; i < 6; i += 2) {
        const x = data[i];
        const y = data[i + 1];
        data[i] = matrix.a * x + matrix.c * y + matrix.e;
        data[i + 1] = matrix.b * x + matrix.d * y + matrix.f;
      }
    }

    return { key: command.key, data };
  });

  return transformedCommands
    .map((command) => (command.key === 'Z' ? 'Z' : `${command.key} ${command.data.join(' ')}`))
    .join(' ');
}
