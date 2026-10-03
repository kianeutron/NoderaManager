"use client";

import { Box, Skeleton, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Tabs, Typography } from "@mui/material";
import { useState } from "react";
import { performanceDimensionValues, type PerformanceDimension, type PeriodRange } from "@/modules/analytics/domain/analytics.schema";
import type { PerformanceRow } from "@/modules/analytics/domain/analytics.types";
import { dimensionLabel, rowLabel } from "@/modules/analytics/ui/breakdown-presentation";
import { smallSample } from "@/modules/analytics/ui/overview-presentation";
import { SmallSampleChip } from "@/modules/analytics/ui/SmallSampleChip";
import { useBreakdown } from "@/modules/analytics/ui/use-analytics-queries";
import { describeError } from "@/shared/api/error-copy";
import { formatPercent, shareOf } from "@/shared/ui/charts/percent-change";
import { ErrorState } from "@/shared/ui/ErrorState";
import { SectionPanel } from "@/shared/ui/SectionPanel";

type SortKey = "sent" | "reached" | "replyRate";
const sortLabel = { sent: "Sent", reached: "Reached", replyRate: "Reply rate" } as const satisfies Record<SortKey, string>;
const replyRateOf = (row: PerformanceRow) => shareOf(row.repliedProspects, row.reached);

type PerformanceBreakdownProps = Readonly<{ range: PeriodRange; by: PerformanceDimension; onByChange: (by: PerformanceDimension) => void }>;

/** Results split by route, persona, country and more. A rate sits beside the counts it comes from, and thin groups are flagged. */
export function PerformanceBreakdown({ range, by, onByChange }: PerformanceBreakdownProps) {
  const query = useBreakdown(range, by);
  const [sortKey, setSortKey] = useState<SortKey>("sent");
  const rows = [...(query.data?.rows ?? [])].sort((left, right) => {
    const value = (row: PerformanceRow) => (sortKey === "replyRate" ? replyRateOf(row) : row[sortKey]);
    return value(right) - value(left) || right.sent - left.sent;
  });

  return (
    <SectionPanel description="Messages sent in this window, split by one thing at a time" title="Performance breakdown">
      <Tabs aria-label="Split results by" onChange={(_event, next: PerformanceDimension) => onByChange(next)} scrollButtons="auto" sx={{ mb: 1.5 }} value={by} variant="scrollable">
        {performanceDimensionValues.map((dimension) => <Tab id={`by-${dimension}`} key={dimension} label={dimensionLabel[dimension]} value={dimension} />)}
      </Tabs>
      {query.isError && !query.data ? <ErrorState description={describeError(query.error, "breakdown")} onRetry={() => void query.refetch()} title="The breakdown could not be loaded" /> : null}
      {query.isPending ? <Stack sx={{ gap: 1 }}>{[0, 1, 2, 3].map((row) => <Skeleton height={34} key={row} variant="rounded" />)}</Stack> : null}
      {query.data && rows.length === 0 ? <Typography color="text.secondary">Nothing was sent in this window, so there is nothing to split.</Typography> : null}
      {query.data && rows.length > 0 ? (
        <>
          <TableContainer>
            <Table aria-label={`Results by ${dimensionLabel[by].toLowerCase()}`} size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{dimensionLabel[by]}</TableCell>
                  {(["sent", "reached", "replyRate"] as const).map((key) => (
                    <TableCell align="right" key={key} sortDirection={sortKey === key ? "desc" : false}>
                      <TableSortLabel active={sortKey === key} direction="desc" onClick={() => setSortKey(key)}>{sortLabel[key]}</TableSortLabel>
                    </TableCell>
                  ))}
                  <TableCell align="right">Bounced</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow hover key={row.key ?? "none"}>
                    <TableCell component="th" scope="row" sx={{ maxWidth: 260 }}><Typography noWrap sx={{ fontWeight: 600 }} variant="body2">{rowLabel(by, row)}</Typography></TableCell>
                    <TableCell align="right">{row.sent.toLocaleString("en")}</TableCell>
                    <TableCell align="right">{row.reached.toLocaleString("en")}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" sx={{ alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
                        {row.reached < smallSample ? <SmallSampleChip /> : null}
                        <Box sx={{ minWidth: 92, textAlign: "right" }}>
                          <Typography sx={{ fontWeight: 700 }} variant="body2">{formatPercent(replyRateOf(row))}</Typography>
                          <Typography color="text.secondary" sx={{ fontSize: 11 }}>{row.repliedProspects} of {row.reached} replied</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{row.bounced > 0 ? row.bounced.toLocaleString("en") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {query.data.groups > rows.length ? <Typography color="text.secondary" sx={{ mt: 1 }} variant="caption">Showing the {rows.length} biggest of {query.data.groups.toLocaleString("en")} groups.</Typography> : null}
        </>
      ) : null}
    </SectionPanel>
  );
}
