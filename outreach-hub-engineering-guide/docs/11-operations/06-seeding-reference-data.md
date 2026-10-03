    # Reference Data and Seeding

    Seed only stable controlled reference values that benefit from database rows, such as initial Routes/Modules or tag presets.

Prefer code constants for closed protocol/domain enums such as channel/status when schema migrations should accompany changes.

Seed command must be idempotent and refuse accidental destructive reset in production.

Provide a separate demo/test fixture seed from real production reference data.

