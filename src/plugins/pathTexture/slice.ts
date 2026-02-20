import type { StateCreator } from 'zustand';

export type TexturePattern = 'stipple' | 'crosshatch' | 'hatching' | 'scribble' | 'dots-grid';
export type HatchAngle = 0 | 45 | 90 | 135;

export interface PathTextureState extends Record<string, unknown> {
  pattern: TexturePattern;
  density: number;
  lineWidth: number;
  angle: HatchAngle;
  spacing: number;
  /** Whether to use the element's stroke color for texture */
  useElementColor: boolean;
  textureColor: string;
  textureOpacity: number;
  /** Random seed for stipple/scribble */
  seed: number;
}

export interface PathTexturePluginSlice {
  pathTexture: PathTextureState;
  updatePathTextureState: (state: Partial<PathTextureState>) => void;
}

const initialState: PathTextureState = {
  pattern: 'hatching',
  density: 50,
  lineWidth: 0.8,
  angle: 45,
  spacing: 6,
  useElementColor: true,
  textureColor: '#000000',
  textureOpacity: 0.8,
  seed: 42,
};

export const createPathTextureSlice: StateCreator<
  PathTexturePluginSlice,
  [],
  [],
  PathTexturePluginSlice
> = (set) => ({
  pathTexture: { ...initialState },

  updatePathTextureState: (updates) => {
    set((state) => ({
      pathTexture: { ...state.pathTexture, ...updates },
    }));
  },
});
