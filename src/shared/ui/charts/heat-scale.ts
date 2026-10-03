export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** How opaque each level is; level 0 is the faint empty cell. */
export const heatOpacity = [0.07, 0.3, 0.52, 0.76, 1] as const satisfies readonly number[];

/** Four shades above empty, scaled to the peak so one spike does not drown out an otherwise quiet grid. Nothing is level 0. */
export const heatLevel = (value: number, peak: number): HeatLevel => (value <= 0 || peak <= 0 ? 0 : (Math.min(4, Math.ceil((value / peak) * 4)) as HeatLevel));
