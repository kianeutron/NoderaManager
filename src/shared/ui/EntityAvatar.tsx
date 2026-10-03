import { Avatar } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import { initialsOf } from "@/shared/lib/initials";

const tones = ["primary", "secondary", "success", "warning", "info"] as const;

/** Stable per name, so the same person or company keeps its color everywhere. */
function toneFor(name: string): (typeof tones)[number] {
  const hash = Array.from(name).reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);
  return tones[hash % tones.length] ?? "primary";
}

type EntityAvatarProps = Readonly<{ name: string; size?: number; icon?: ReactNode }>;

/** Initials (or an icon) on a soft tinted circle. Decorative: the name is always shown beside it. */
export function EntityAvatar({ name, size = 40, icon }: EntityAvatarProps) {
  const tone = toneFor(name);

  return (
    <Avatar aria-hidden sx={(theme) => ({ bgcolor: alpha(theme.palette[tone].main, 0.22), color: theme.palette[tone].light, fontSize: size * 0.36, fontWeight: 800, height: size, width: size })}>
      {icon ?? initialsOf(name)}
    </Avatar>
  );
}
