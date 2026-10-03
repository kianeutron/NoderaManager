    # Zero-Cost Infrastructure Guardrails

    The initial product must require no monthly paid infrastructure.

## Providers

- Vercel Hobby for app/functions.
- Neon Free for Postgres.
- Vercel Blob Hobby for private library storage.

Free-plan terms can change. Do not encode current quota numbers as permanent architectural facts.

## Guardrails

- show storage/database usage where provider APIs make it safely available;
- enforce app-level upload size/file count limits below provider limits;
- paginate all large reads;
- no polling loops that burn function/database usage;
- no high-frequency cron requirements;
- no paid map API;
- no paid AI API required by core functionality;
- no transactional email service required by core functionality;
- no paid search/vector service.

If a free limit is reached, fail with an explicit operational message. Do not automatically upgrade or enable billable overage.

Provider adapters must make migration possible without rewriting domain/application logic.

