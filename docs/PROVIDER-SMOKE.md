# Provider Smoke Checks

These checks verify the credential-backed integrations that cannot be fully proven in unit tests.

## Readiness API

Sign in as an admin and request:

```text
/api/health/readiness
```

Expected:

- `readyForNonPaymentLaunch` is `true` when PostgreSQL is reachable.
- `checks[].status` is `pass` for configured production providers.
- `warnings` only contains intentionally local or mock providers.

## Clerk

1. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_WEBHOOK_SECRET`.
2. Sign in with a real Clerk user.
3. Confirm the user exists in Prisma `User`.
4. As admin, change a test user's role/status at `/admin/users`.
5. Confirm Clerk public metadata reflects the updated role/status.
6. Trigger the Clerk webhook for user deletion and confirm the Prisma user status becomes `CLOSED`.

## Object Storage

1. Set the `STORAGE_*` variables for the target S3-compatible bucket.
2. Sign in as seller or admin.
3. Upload a JPEG, PNG, or WebP through the listing media uploader.
4. Confirm `/api/upload` returns `provider: "s3"`.
5. Open the returned URL in a clean browser session and confirm the media renders.

## SMTP

1. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
2. Trigger these actions with test accounts:
   - buyer sends seller a listing message
   - buyer creates an offer
   - admin approves or rejects a listing
   - admin approves or rejects a seller application
3. Confirm the recipient receives each email and the app action still completes if the provider is slow.

## AI Provider

For DeepSeek:

```env
AI_PROVIDER="deepseek"
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-v4-flash"
```

For Hugging Face:

```env
AI_PROVIDER="huggingface"
HUGGINGFACE_API_KEY=""
HUGGINGFACE_MODEL="openai/gpt-oss-20b"
```

Then sign in as buyer, seller, or admin and call:

```text
POST /api/ai/pricing
POST /api/ai/listing-assistant
```

Expected: HTTP 200 with a provider-specific response, not `provider: "mock"`.

## Workflow Smoke Runner

With the local dev server running and first-party credential auth enabled:

```bash
npm run smoke:workflows
```

Against another first-party credential auth environment:

```bash
SMOKE_BASE_URL="https://your-host.example" npm run smoke:workflows
```

This runner checks public marketplace pages, buyer pages, seller pages, admin pages, database health, readiness health, AI pricing, and notification read API behavior.
