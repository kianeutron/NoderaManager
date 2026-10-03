"use client";

import { useAnimatedNumber } from "@/shared/ui/charts/use-animated-number";

type AnimatedNumberProps = Readonly<{ value: number; format?: ((value: number) => string) | undefined }>;

const wholeNumber = (value: number) => Math.round(value).toLocaleString("en");

/** A figure that eases to its value. Assistive technology reads the final value, not the animation. */
export function AnimatedNumber({ value, format = wholeNumber }: AnimatedNumberProps) {
  const shown = useAnimatedNumber(value);
  return <span aria-label={format(value)} role="text">{format(shown)}</span>;
}
