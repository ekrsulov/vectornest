export type RandomSource = () => number;

let randomSource: RandomSource = () => Math.random();

export const setRandomSource = (source?: RandomSource): void => {
  randomSource = source ?? (() => Math.random());
};

export const random = (): number => randomSource();

export const randomInRange = (min: number, max: number): number =>
  min + (max - min) * random();

export const randomInt = (min: number, maxInclusive: number): number =>
  Math.floor(randomInRange(min, maxInclusive + 1));

export const randomSigned = (magnitude: number): number =>
  randomInRange(-magnitude, magnitude);

export const randomAngle = (): number => randomInRange(0, Math.PI * 2);

export const randomHexColor = (): string =>
  `#${randomInt(0, 0xffffff).toString(16).padStart(6, '0')}`;
