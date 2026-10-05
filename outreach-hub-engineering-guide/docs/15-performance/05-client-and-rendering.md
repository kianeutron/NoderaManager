# Client and Rendering Performance

How the browser gets from a click to pixels: navigation structure, rendering model, data fetching, JavaScript size, styling cost, animation, and responsiveness to input. Stack: Next.js 16 App Router, React 19, MUI with Emotion, TanStack Query.

## 1. Navigation: instant feedback, minimal re-render

A navigation is fast when something useful appears the moment the user clicks, and when only the part that changed re-renders.

**Rules**

1. **One shell in a layout.** The sidebar, header and providers live in a shared `layout.tsx` (a route group such as `app/(dashboard)/layout.tsx`), rendered once. Pages render only their own content. Next.js re-renders only the segments below the shared layout on a client navigation ("partial rendering"), and the shell keeps its state (collapsed navigation, scroll in the sidebar). Wrapping each page in its own `AppShell` throws the shell away and rebuilds it on every navigation.
2. **Every route has loading UI.** A `loading.tsx` (a skeleton with the page's real dimensions) shows immediately on click and is also what a link prefetch can fetch for a dynamic route. Without it a dynamic route shows nothing until the server finishes, and prefetching cannot help.
3. **Suspense below the fold.** Put slow sections inside `<Suspense fallback={...}>` so the fast parts render first.
4. **Use `next/link` for internal navigation.** It prefetches when the link enters the viewport. Do not disable prefetch on primary navigation. Use `router.prefetch` or `prefetch` on links the user is likely to click next (the first rows of a list).
5. **Keep UI state in the URL** (filters, selected record), as the app already does: back, forward and sharing work, and no state is lost between navigations.
6. **Do not `router.refresh()` to update a list.** Invalidate the query that owns it.

**Dynamic by design.** The root layout reads `cookies()` and `headers()` (theme and CSP nonce) and sets `force-dynamic`, so every route renders per request. That is a consequence of a nonce-based CSP and of per-user pages, and it is fine for a signed-in dashboard, provided navigation shows the shell and a skeleton at once (rules 1 to 3). To go further, adopt Cache Components with partial prefetching (`cacheComponents`, `partialPrefetching` in `next.config.ts`), which prerender a static shell and stream the dynamic parts; do it after the structure above is in place and measure first.

## 2. Server and client components

- Components are server components unless they need state, effects, or browser APIs. Push `"use client"` down to the smallest interactive component and pass server-rendered content as `children`. 72 percent of components are client components today; a dashboard needs many, but a page should be a thin server component that fetches, then hands data to client islands.
- Server code runs next to the database (after the region is fixed), so data the first screen needs is fetched there, in parallel, not by the browser after hydration.
- Never call your own API route from a server component (an extra HTTP hop); call the service directly.

### Prefetch on the server and hydrate

Removes the "load page, hydrate, then fetch" waterfall for the first screen:

```tsx
// app/(dashboard)/page.tsx  (server component)
const queryClient = new QueryClient();
await queryClient.prefetchQuery({ queryKey: analyticsKeys.overview("30d"), queryFn: () => analytics.getOverview({ range: "30d" }) });

return <HydrationBoundary state={dehydrate(queryClient)}><OverviewPage /></HydrationBoundary>;
```

Rules: use the same query key as the client hook; give the hydrated query a `staleTime` so the client does not immediately refetch it; create the `QueryClient` per request; prefetch with the service function, not by calling the HTTP API. Prefetch only the first screen (the default URL state), not every possible filter.

## 3. TanStack Query

| Topic | Rule |
| --- | --- |
| `staleTime` | Reference data (routes, personas): minutes. Lists: 30 s (current default). Live figures (overview, analytics): 30 to 60 s plus invalidation by the mutations that change them; `0` only if the figure must never lag, and then it pays the full cost on every open |
| `gcTime` | Keep the default (5 min); lower it only for very large results |
| `refetchOnWindowFocus` | Off (current); a single-user tool does not need it |
| Keys | Include every input; mutations invalidate the key root (`routeKeys.all`), not individual keys, so nothing is missed and nothing extra is refetched |
| `placeholderData: keepPreviousData` | Keep it on lists and filtered views so a filter change never blanks the screen (already used) |
| `select` | Derive view data from a cached result instead of fetching a variant |
| Waterfalls | A query that needs another query's result doubles the latency. Fetch together on the server, or add one combined endpoint |
| Prefetch on intent | `queryClient.prefetchQuery` on hover or focus of a row or tab; the open then reads from cache |
| Mutations | Update the cache optimistically for toggles and archive; invalidate on settle (already the pattern) |
| Retries | Keep `shouldRetryRequest` (no retry on 4xx); retries multiply latency when the server is slow |

Avoid refetching the same data from several components: components read the same key, and the cache de-duplicates concurrent requests.

## 4. JavaScript size

Budget: first load per dashboard route 200 KB gzip or less (sign-in 120 KB). Measured today: 211 to 417 KB (`01-audit-findings.md`, C6).

1. **Load heavy code on demand** with `next/dynamic` (`ssr: false` for browser-only code):
   - charts (Recharts, about 113 KB gzip), shown below the fold or behind `Suspense`;
   - decorative backgrounds (WebGL), loaded only for the selected one;
   - dialogs that contain forms (react-hook-form, zod resolvers), loaded when opened;
   - the library page's preview and upload code.
2. **Import by path, not by barrel.** Icons are imported from `@mui/icons-material/Name` (keep it so). `@mui/material`, `@mui/icons-material` and `recharts` are optimised automatically by `optimizePackageImports`; do not add barrel files of your own.
3. **Keep server code out of client bundles.** Schemas shared between client and server must not import database modules (the value lists live in dependency-free files for this reason). `import "server-only"` guards server modules.
4. **One copy of each library.** Use `npx next experimental-analyze` (Next.js 16.1 or later) to see which modules land in which chunk and why; duplicated or unexpectedly large modules show up there.
5. **Dependencies are a cost.** Before adding one, check its size and whether a small function does the job (`AGENTS.md`). An installed but unimported package (`react-simple-maps`, `@xyflow/react` today) costs nothing at runtime but is noise; remove what has no plan.
6. **No third-party scripts** in the dashboard. If one is ever needed, load it with `next/script` and `strategy="lazyOnload"`.
7. **Enforce it:** record the first-load size per route after each production build and fail the check when a route exceeds its budget (`06-measurement-and-monitoring.md`).

## 5. Styling cost (MUI and Emotion)

- Emotion computes styles at render time. `sx` is convenient and not free: about 100 ms more per thousand elements than static styles. Rules: use `sx` for layout glue; for components that render many times (rows, cells, chart tooltips) use `styled()` or a theme `styleOverrides` entry so the style is computed once.
- Do not create new objects, arrays or inline functions inside `sx` on list items when a constant would do; hoist constants to module scope.
- Use theme tokens (`theme.palette`, spacing) instead of recomputing colors; the theme enables CSS variables so theme switching does not rebuild every class.
- Skip layout and paint for what is offscreen: `content-visibility: auto` with `contain-intrinsic-size` on long, below-the-fold sections.
- Keep DOM size sensible: a few thousand nodes per page. Virtualise any list that can render more than about 100 rows at once (a windowing library, not hand-written).
- Shadows and large gradients are cheap compared with blur; blur is the exception (next section).

## 6. Translucency, blur and animation

These are the most expensive things on the page because they run on the GPU every frame.

**Blur (`backdrop-filter`)**

- `blur()` is the most expensive filter: it samples a large area around every pixel, and when what is behind it changes (an animated background, scrolling content) the browser must recompute it every frame.
- Budget: at most 3 blurred layers visible at once, radius 12 px or less. Today a page can have about 20 at 24 px.
- Use blur for the shell (sidebar, top bar), the hero, and dialogs. Cards inside the page use a flat translucent fill (`rgba` plus a border). The look stays; the cost goes.
- Turn it off for `@media (prefers-reduced-transparency: reduce)`, `(prefers-reduced-motion: reduce)` and small screens.
- Never animate the blur radius or transition `backdrop-filter`.

**Animated backgrounds**

- Default to static (a CSS gradient or one rendered frame). Animated or WebGL backgrounds are an opt-in setting.
- When one is on: cap to 30 fps, cap device pixel ratio at 1 (an optional 1.5), render at a reduced resolution scale, pause when the tab is hidden or the element is offscreen (already done), and **pause while scrolling or typing**, resuming after about 150 ms of idle.
- Load the code only for the selected background (`next/dynamic`), so the WebGL library is not in the shared bundle.
- Never run two animation loops for one visual; use one `requestAnimationFrame` loop and drive everything from it.
- Respect `prefers-reduced-motion` and the Save-Data hint (`navigator.connection?.saveData`).

**Micro-animations**

- Animate only `transform` and `opacity`; they run on the compositor. Animating `width`, `height`, `top`, `left` or `box-shadow` triggers layout or paint.
- Count-up numbers and ring transitions are cheap and fine (and already honour reduced motion); keep them under 700 ms and off lists.
- `will-change` only on elements that are animating right now, and remove it after.

## 7. Responsiveness to input (INP)

Target 200 ms or less for every interaction.

- Keep event handlers short; do heavy derivation in `useMemo` or on the server, not in the click.
- Wrap non-urgent updates in `startTransition` (switching a tab, applying a filter) so typing and clicking stay responsive; use `useDeferredValue` for search results.
- Debounce search input (`use-debounced-input` exists) and cancel superseded requests (TanStack Query does).
- Split large contexts: a context whose value changes often (theme, background) must not wrap components that do not read it; read context in the leaf.
- Do not render charts or large tables synchronously inside the click handler's update; show a skeleton and let them mount in a transition.
- Profile with the React Profiler and the Chrome Performance panel; look for long tasks (over 50 ms) after an interaction.

## 8. Memoisation and the React Compiler

- Do not hand-memoise by default; it adds code and bugs. Memoise a value only when profiling shows a cost (an expensive derivation, a referentially unstable prop that defeats a `memo` child).
- The React Compiler (`reactCompiler: true`, with `babel-plugin-react-compiler`) memoises automatically, and Next.js applies it only to relevant files. Evaluate it after the structural fixes above, with a before and after profile; build time rises a little.

## 9. Fonts and images

- The app uses the system font stack: no font request, no layout shift. If a web font is ever added, use `next/font` (self-hosted, preloaded, `display: swap`).
- Raster images use `next/image` (sized, lazy, modern formats). Decorative backgrounds are CSS or canvas, never large image files.

## 10. Perceived performance and layout stability

- Skeletons have the same dimensions as the content (CLS under 0.1); do not let content push other content down when it arrives.
- Keep the previous data on screen while the next loads (already `keepPreviousData`), and show progress only when the wait is longer than about 300 ms.
- Show optimistic results for actions with predictable outcomes (archive, restore, complete).
- Slow first request after the database sleeps (`02-infrastructure-and-network.md`): the skeleton is the answer; never a blank screen or a spinner that blocks the shell.

## 11. Checklist for a new screen or component

- [ ] Rendered inside the shared layout; has a `loading.tsx` or a Suspense fallback of the right size.
- [ ] `"use client"` only on the interactive leaves; first screen data prefetched on the server where it matters.
- [ ] Query keys, `staleTime` and invalidation chosen deliberately.
- [ ] Heavy libraries and dialogs loaded on demand; first-load size checked against the budget.
- [ ] No more than one blurred layer added; animation uses transform and opacity, respects reduced motion.
- [ ] Lists over about 100 rows are virtualised; large derivations are memoised or moved to the server.
- [ ] Interactions stay under 200 ms in the Performance panel.
