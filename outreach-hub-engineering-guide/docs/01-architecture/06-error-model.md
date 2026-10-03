    # Error Model

    Use a small explicit application error taxonomy:

- `ValidationError`
- `AuthenticationError`
- `AuthorizationError`
- `NotFoundError`
- `ConflictError`
- `DuplicateCandidateError`
- `RateLimitError`
- `ExternalServiceError`
- `InvariantError`

Application services return/throw domain-aware errors. API/MCP adapters map them to protocol-specific responses.

Never leak database errors, stack traces, SQL, blob URLs/tokens, or provider internals to the browser/MCP client.

Each logged error gets:

- request/correlation ID;
- operation name;
- safe entity IDs;
- error category;
- sanitized context.

Do not log secrets, full auth headers, OAuth tokens, session cookies, private file contents, or entire outreach bodies by default.

## In code

`ApplicationError` (`src/shared/errors/application-error.ts`) carries a `code` (`not_found`, `conflict`, `unsupported`, `limit_exceeded`) and a caller-safe message. Services throw it for expected, correctable failures and adapters map the code: MCP shows the message as a tool error, HTTP maps it to a status. Any other error is unexpected and is masked at every boundary. Module errors extend it (`LibraryCommandError`).

## The contract at each boundary

**Rule: no server-side text ever reaches a user.** Not an `ApplicationError` message, not a database or network message, not a Zod default.

| Layer | Behavior |
| --- | --- |
| Services | Throw `ApplicationError(code, message, reason?)`. `message` is written for the MCP caller (an assistant that can act on ids and tool names). `reason` is an optional stable cause from `shared/errors/error-reasons.ts`; add one whenever a screen can trigger the failure. |
| `classifyError` | Also turns Postgres constraint violations (`23505` unique, `23503` foreign key, `23514` check) into a `conflict`, so two requests racing past a service's own check get a meaningful answer, not a 500. |
| Web API (`shared/api/api-error-handler.ts`) | One handler for all routes. Body is `{ code, reason?, requestId }` with **no free text**. Status: `not_found` 404, `conflict` 409, `unsupported`/`limit_exceeded` 400, `unavailable` 503, `rate_limited` 429 (with `Retry-After`), access 401/403, malformed request 400, anything else 500. A validation failure is `400 VALIDATION_ERROR` with `invalidFields` (field names only); forms mark those inputs (`markInvalidFields`). Unknown routes answer in the same shape. |
| Unexpected errors | Masked as `INTERNAL_ERROR`. Logged once by `logUnexpectedError` (scope, request id, method, path, error type, database code) and **never the message**, which can hold SQL and values. |
| Request id | `hono/request-id` runs first; the id is in `X-Request-Id`, in the log line and in the body of a failure. |
| MCP (`runMcpTool`) | Expected and classified failures show their `message` to the assistant; everything else is masked and logged the same way. |
| Client (`shared/api/error-copy.ts`) | `describeError(error, noun)` is the only way an error becomes text: reason copy first, then status copy, then network copy, then a generic sentence. Server faults show `Reference: <requestId>`. A `Record<ApplicationReason, string>` makes a reason without copy a build error. |
| Forms | Validate with the command schema; `describeIssue` (parse-level error map) replaces Zod's stock English, while a message a schema author wrote always wins. Server rejections and failed duplicate checks show through `describeError`, entered data stays. |
| Storage | The Blob adapter turns any provider failure into `unavailable` / `storage_unavailable` (503, retryable) and logs only the error type. |
| Sign-in | `describeSignInError` looks up the provider's `?error=` code and never displays it; a failed start shows fixed copy and re-enables the button. |
| Session | A `401` from any request sends the user to sign-in once (`create-query-client.ts`). |
| Rendering failures | `app/error.tsx` and `app/global-error.tsx` show a fixed message and the error digest as the reference, never the error. |

## Checklist for a new feature

1. Throw `ApplicationError` for anything the caller can correct; give it a `reason` if a screen can hit it, and add the copy.
2. Never build a user-facing sentence from `error.message`; call `describeError`.
3. Never catch and ignore: show it, or rethrow it.
4. Client code throws `ApiRequestError` via `toApiRequestError`, never a plain `Error` with server text.
5. Test the failure paths: expected (reason copy), unexpected (generic + reference, no internals), offline.

