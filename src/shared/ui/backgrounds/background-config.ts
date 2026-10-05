/** `still` is the default: a painted gradient with no animation, the cheapest option by far. The others draw on the GPU every frame. */
export const backgroundNames = ["still", "topography", "ferrofluid", "plasma"] as const;
export type BackgroundName = (typeof backgroundNames)[number];

export const defaultBackground: BackgroundName = "still";

export function isBackgroundName(value: string | null | undefined): value is BackgroundName {
  return typeof value === "string" && (backgroundNames as readonly string[]).includes(value);
}
