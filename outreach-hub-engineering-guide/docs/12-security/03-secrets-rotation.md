    # Secrets and Rotation

    Inventory secrets and owners:

- Neon database credentials;
- Vercel Blob token;
- dashboard OAuth client secret;
- MCP auth/JWT verifier configuration;
- optional connector/API credentials.

Store only in Vercel environment secrets/provider configuration.

Document rotation procedure for each secret. After rotation, invalidate/redeploy old credentials promptly.

Never paste production secrets into AI prompts, issue trackers, screenshots, fixtures, or `.env.example`.

