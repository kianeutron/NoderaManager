export const backgroundNames = ["topography", "ferrofluid", "plasma"] as const;
export type BackgroundName = (typeof backgroundNames)[number];

export function isBackgroundName(value: string | null | undefined): value is BackgroundName {
  return typeof value === "string" && (backgroundNames as readonly string[]).includes(value);
}
