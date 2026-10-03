import { Typography } from "@mui/material";
import type { Rate } from "@/modules/analytics/domain/analytics.types";
import { KpiTile } from "@/modules/analytics/ui/KpiTile";
import { smallSample } from "@/modules/analytics/ui/overview-presentation";
import { formatPercent, shareOf } from "@/shared/ui/charts/percent-change";
import { RadialGauge } from "@/shared/ui/charts/RadialGauge";

type RateTileProps = Readonly<{
  label: string;
  rate: Rate;
  color: string;
  /** What the part and whole are: "prospects replied", "emails bounced". */
  unit: string;
  lowerIsBetter?: boolean;
}>;

/** A rate as a ring, with the counts it comes from and a warning when they are too few to mean much. */
export function RateTile({ label, rate, color, unit, lowerIsBetter = false }: RateTileProps) {
  const { part, whole } = rate.current;
  const share = shareOf(part, whole);

  return (
    <KpiTile
      caption={<>{part} of {whole} {unit}{whole > 0 && whole < smallSample ? <Typography component="span" sx={{ color: "warning.main", ml: 0.75 }} variant="caption">· small sample</Typography> : null}</>}
      format={(value) => formatPercent(value / 100)}
      label={label}
      lowerIsBetter={lowerIsBetter}
      previous={shareOf(rate.previous.part, rate.previous.whole) * 100}
      value={share * 100}
      visual={<RadialGauge color={color} label={`${part} of ${whole} ${unit}`} share={share} size={72} thickness={7} />}
    />
  );
}
