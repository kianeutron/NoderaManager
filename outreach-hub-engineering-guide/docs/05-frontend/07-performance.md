    # Frontend Performance

    - paginate/virtualize large tables when needed;
- avoid rendering full message/document bodies in list rows;
- memoize only after identifying actual render pressure;
- lazy-load heavy graph/map/editor surfaces;
- avoid shipping server-only packages to client bundles;
- use dynamic imports for heavy visualization modules;
- keep client component boundaries small;
- use image optimization only for actual image assets;
- preserve responsive shell while data loads;
- measure bundle changes when introducing large packages.

Do not sacrifice correctness for speculative micro-optimization.

