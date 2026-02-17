import type { Command, SubPath } from '../../types';
import { parsePathD } from '../../utils/pathParserUtils';
import { normalizeToMLCZ } from '../../utils/svg/normalizer';

export function parseSvgPathToSubPaths(d: string): { ok: true; value: SubPath[] } | { ok: false; error: string } {
  try {
    const normalized = normalizeToMLCZ(d);
    const commands = parsePathD(normalized);

    if (!commands.some((c) => c.type === 'M')) {
      return { ok: false, error: 'Path must contain at least one M command.' };
    }

    const subPaths: SubPath[] = [];
    let current: Command[] = [];

    commands.forEach((cmd) => {
      if (cmd.type === 'M') {
        if (current.length > 0) {
          subPaths.push(current);
        }
        current = [cmd];
      } else {
        current.push(cmd);
      }
    });

    if (current.length > 0) {
      subPaths.push(current);
    }

    if (subPaths.length === 0) {
      return { ok: false, error: 'Failed to parse path.' };
    }

    return { ok: true, value: subPaths };
  } catch {
    return { ok: false, error: 'Invalid SVG path data.' };
  }
}
