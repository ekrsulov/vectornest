
export type CubicBezier = [number, number, number, number];

export interface Segment {
    t0: number;
    t1: number;
    v0: number; // For visualization/graph. Real value might be complex string.
    v1: number;
    spline: CubicBezier;
    index: number; // Index in the keyTimes array (i)
}

export interface KeyframeTrack {
    values: string[]; // Keep as strings to support complex values like "rotate(360 50 50)"
    keyTimes: number[];
    keySplines: CubicBezier[];
}

/**
 * Parses animation attributes into a structured KeyframeTrack.
 */
export const parseAnimationData = (
    valuesStr: string,
    keyTimesStr: string,
    keySplinesStr: string
): KeyframeTrack => {
    // defaults
    let values: string[] = [];
    let keyTimes: number[] = [];
    let keySplines: CubicBezier[] = [];

    // Parse Values
    if (valuesStr) {
        values = valuesStr.split(';').map(v => v.trim());
    }

    // Parse KeyTimes
    if (keyTimesStr) {
        keyTimes = keyTimesStr.split(';').map(t => parseFloat(t));
    } else {
        // If no keyTimes, distribute evenly
        if (values.length > 1) {
            keyTimes = values.map((_, i) => i / (values.length - 1));
        } else {
            keyTimes = [0, 1];
        }
    }

    // Parse KeySplines
    if (keySplinesStr) {
        const splineStrings = keySplinesStr.split(';');
        keySplines = splineStrings.map(s => {
            const parts = s.trim().split(/\s+/).map(n => parseFloat(n));
            if (parts.length === 4 && !parts.some(isNaN)) {
                return parts as CubicBezier;
            }
            return [0.5, 0, 0.5, 1]; // Default easeish
        });
    }

    // Validate lengths
    // SMIL: keyTimes.length should match values.length
    // keySplines.length should be keyTimes.length - 1

    // Fill missing splines if needed
    const expectedSplines = Math.max(0, keyTimes.length - 1);
    while (keySplines.length < expectedSplines) {
        keySplines.push([0.5, 0, 0.5, 1]); // ease
    }
    // Trim extra splines
    if (keySplines.length > expectedSplines) {
        keySplines = keySplines.slice(0, expectedSplines);
    }

    return { values, keyTimes, keySplines };
};

/**
 * Serializes the track back to SVG input strings.
 */
export const serializeAnimationData = (track: KeyframeTrack) => {
    return {
        values: track.values.join('; '),
        keyTimes: track.keyTimes.map(t => Number(t.toFixed(3))).join('; '),
        keySplines: track.keySplines.map(s => s.map(n => Number(n.toFixed(3))).join(' ')).join('; ')
    };
};

/**
 * Extract a numeric value for visualization from a value string.
 * E.g. "360 50 50" -> 360
 * "0.5" -> 0.5
 */
export const extractNumericValue = (valStr: string): number => {
    if (!valStr) return 0;
    const match = valStr.match(/-?[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
};

export const getSegments = (track: KeyframeTrack): Segment[] => {
    const segments: Segment[] = [];
    for (let i = 0; i < track.keyTimes.length - 1; i++) {
        segments.push({
            index: i,
            t0: track.keyTimes[i],
            t1: track.keyTimes[i + 1],
            v0: extractNumericValue(track.values[i]),
            v1: extractNumericValue(track.values[i + 1]),
            spline: track.keySplines[i] || [0, 0, 1, 1]
        });
    }
    return segments;
};
