"use client";

import { Skeleton } from "@mui/material";
import dynamic from "next/dynamic";

// The charting library is about 110 KB gzipped, so it loads after the first paint instead of with the page. The skeleton
// is the panel's size, so nothing moves when the chart arrives.
const chartFallback = () => <Skeleton height={340} sx={{ borderRadius: 3 }} variant="rounded" />;

export const ActivityChart = dynamic(() => import("@/modules/analytics/ui/ActivityChart").then((module) => module.ActivityChart), { ssr: false, loading: chartFallback });
export const ChannelMix = dynamic(() => import("@/modules/analytics/ui/ChannelMix").then((module) => module.ChannelMix), { ssr: false, loading: chartFallback });
