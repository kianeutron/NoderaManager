    # Web Security Headers and Browser Safety

    Configure and test:

- Content-Security-Policy;
- `frame-ancestors` / clickjacking control;
- `X-Content-Type-Options: nosniff`;
- strict Referrer-Policy;
- Permissions-Policy;
- HSTS on production HTTPS domain;
- secure cookie flags.

MUI/Emotion styling must work with the selected CSP strategy. Do not weaken CSP to `unsafe-eval` broadly just to silence an integration issue.

Avoid third-party analytics/scripts unless explicitly needed.

