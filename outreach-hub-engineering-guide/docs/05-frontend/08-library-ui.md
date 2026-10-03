# Library UI

Route: `/library` (`src/app/library/page.tsx`, owner-guarded by `requireDashboardPageAccess`). Feature code lives in `src/modules/library/ui/`.

## Page structure

```text
AppShell
  PageHeader
  grid: content column | preview dock (xl and up)
    LibrarySearchField            debounced, writes ?q= with history "replace"
    RecentDocuments               shelf of the 6 latest changes; hidden while filtering
    LibrarySection "All documents"
      CategoryChips               counts come from the facets endpoint
      LibraryFilterBar            tag, folder, sort, clear
      LibraryResults              loading / error / empty / grid + "Show more"
    DocumentPreviewDock
      DocumentPreviewPanel        loads one document, pins the actions
        DocumentPreview           pure presentation (cover, facts, tags, description, details, links, versions)
        DocumentActions           Open / Download
```

## Responsive behavior

- Cards use an auto-filling CSS grid (`minmax(150px, 1fr)`), so column count follows the available width with no breakpoint logic.
- The shelf and the category chips scroll horizontally on small screens; the shelf is focusable so keyboard users can scroll it.
- At `xl` and up the preview is a sticky panel beside the list. Below `xl` the same panel content opens in a right-hand drawer (full width on phones). Placement is the dock's only job; the panel does not know where it lives.
- The app shell's own mobile navigation is out of scope for this page.

## State ownership

- **URL** (`use-library-url-state.ts`): `q`, `category`, `tagId`, `folderId`, `sort` and `doc`. Filters and the open document are therefore shareable and work with the back button. Defaults are omitted; invalid values fall back to the default view. Parsing and serializing are pure functions in `library-url-state.ts`.
- **TanStack Query** (`use-library-queries.ts`): list (infinite, cursor based; `nextCursor` is the page param), recent, detail and facets, behind one key factory. Client errors (404/400) are not retried.
- **Merging pages**: `mergeDocumentPages` concatenates loaded pages, drops repeated ids and reads the total from the first page.
- **Component state**: only the search draft (`useDebouncedInput`) and the drawer's remembered document.

## Data flow

`ui` -> typed Hono client (`library-api.ts`) -> `library.routes.ts` -> application services -> repository. No component imports the database, and no component builds URLs by hand: file links come from the client's `$url`.

## Rules

- Category, file type, link and status labels live in `document-presentation.ts`. Each map is `satisfies Record<Union, ...>`, so adding a value to the database enum fails type-checking until the UI has a label for it.
- Document text (title, description, tags, change notes) is always rendered as text, never as HTML.
- Every data-dependent region has loading, error and empty states. Errors keep the rest of the page usable.
- Cards carry no formatting logic beyond presentation helpers; they never fetch.
- The document "cover" is generated from category color and file-type glyph. There is no thumbnail pipeline.

## Not built yet

Upload, edit metadata, archive, folder management, version upload and link editing. They arrive as mutations behind services that write audit events.
