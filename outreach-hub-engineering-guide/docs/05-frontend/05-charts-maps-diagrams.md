    # Charts, Maps, and Diagrams

    Visualizations must answer a question.

## Charts

Use Recharts for:

- outreach volume by route/channel;
- response-depth funnel;
- replies over time;
- route/persona/country performance;
- bounce/delivery trends.

Do not display statistically meaningless “conversion rates” when sample sizes are tiny without showing counts.

## Map

Use bundled country geometry; no paid map tile/API. Aggregate by country server-side. Hover shows counts; click filters underlying records.

Store ISO country codes, not only free-text country names.

## Relationship graph

Use @xyflow/react for Route -> Module -> Prospect/Organization relationships and optionally referral networks. Keep graph queries bounded and lazy-load detail. Graph is a secondary exploration view, not the primary CRUD interface.

## Shared chart primitives

`src/shared/ui/charts` holds what every chart needs, so no screen draws its own:

- `useChartColors` takes colors from the selected theme (all seven), so charts follow it; never write a hex value in a chart.
- `ChartTooltip` is the glass tooltip body for every Recharts chart.
- `Sparkline` (a trend with no axes), `RadialGauge` (a ring with a centred label), `DeltaChip` (movement against the period before, in words as well as color), `AnimatedNumber` (eases to its value; honors reduced motion).
- `percent-change.ts`: `changeBetween`, `shareOf`, `formatPercent`. A first-ever figure is "new", never an infinite percentage.

Every chart is a labelled image (`role="img"` with the figures in its label) and sits beside the counts behind any percentage.

