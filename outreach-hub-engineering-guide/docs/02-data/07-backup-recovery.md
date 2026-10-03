    # Backup and Recovery

    Free tiers are not a substitute for a backup strategy.

Initial strategy:

- periodic logical export of critical relational data to encrypted local/user-controlled storage;
- periodic manifest of Blob objects with checksums;
- document files remain separately downloadable/exportable;
- test restore into a non-production database before calling backups reliable.

Before migrations or large imports, create an export/checkpoint.

Recovery priorities:

1. identities and organizations;
2. exact outreach/interactions and external IDs;
3. strategy/campaign relationships;
4. audit history;
5. documents and metadata;
6. derived analytics/search indexes.

Derived tables/indexes should be rebuildable from canonical data.

