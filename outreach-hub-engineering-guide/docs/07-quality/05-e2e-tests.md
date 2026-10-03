    # End-to-End Tests

    Use Playwright only for critical workflows:

1. authenticate and open dashboard;
2. create organization/person with duplicate warning;
3. create prospect and log outreach;
4. append reply and schedule follow-up;
5. upload/search/open private library document;
6. filter analytics/map from stored data;
7. verify unauthorized user cannot access private routes.

Use role/test IDs only where semantic selectors are insufficient. Do not bind tests to fragile CSS classes.

Seed a deterministic test dataset. Keep E2E suite small enough to run on each pull request.

