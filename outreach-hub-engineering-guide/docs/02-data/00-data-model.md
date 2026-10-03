    # Conceptual Data Model

    Core relationships:

```text
Route 1 --- * Module
Campaign * --- * Route/Module        (campaign_routes; a null module means the whole route)
Campaign * --- * Prospect            (campaign_prospects)
Organization 1 --- * Person
Person 1 --- * Prospect
Organization 1 --- * Prospect
Prospect * --- 1 Route
Prospect * --- 0..1 Module           (the module must belong to the prospect's route)
Prospect 1 --- * Signal
Prospect 1 --- * Outreach
Outreach 1 --- * Interaction
Prospect 1 --- * Interaction
Prospect 1 --- * FollowUp            (optionally originating from an outreach or interaction)
Person/Org/Prospect * --- * Note     (note_links)
Person/Org/Prospect/Outreach/Interaction 1 --- * ExternalRef
Document * --- * Person/Org/Prospect/Route/Campaign  (document_links)
Tag * --- * Document/Person/Org/Prospect             (tag_links)
All mutations --- AuditEvent
```

Separate identity from qualification. A Person can exist once while participating in several campaigns/routes over time. Do not create duplicate Person rows because a new campaign targets them again.

A Prospect represents strategy context and lifecycle, not a human identity.

External channel identifiers should be first-class fields/tables so Gmail thread IDs and future integrations can resolve records deterministically.

Field-level rules, per table, are in [08-crm-schema-reference.md](08-crm-schema-reference.md).
