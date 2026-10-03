    # MUI Design System and Figma Rules

    The supplied Vision UI Dashboard Figma file is visual direction, not permission to hardcode every visual value independently.

## Build tokens first

Centralize:

- background/surface colors;
- glass surface opacity/blur;
- border colors;
- text primary/secondary/muted;
- accent/status colors;
- spacing scale;
- radii;
- elevation/shadows;
- typography;
- transition durations.

Implement these through MUI theme tokens and reusable components.

## Visual rules

- dark dashboard base;
- glass effects used selectively, not on every element;
- restrained blue/cyan accents rather than excessive gradients;
- compact but breathable data tables;
- cards should have clear information purpose;
- consistent title/subtitle/actions layout;
- avoid decorative charts with no decision value.

## Component primitives

Create reusable app-level primitives such as:

- `AppShell`
- `PageHeader`
- `GlassPanel`
- `MetricCard`
- `StatusChip`
- `DataTableShell`
- `EmptyState`
- `ErrorState`
- `ConfirmDialog`
- `FilterBar`
- `EntityAvatar`
- `TimelineItem`

Do not style the same glass panel from scratch across pages.

