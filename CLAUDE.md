# iHobbyWorld Handoff Context

This file is for future AI coding agents, especially Claude Code. Read it before making changes.

## Objective

The user supplied `iHobbyWorld.html` as a high-fidelity mockup and asked for a production-ready dynamic web application. The desired product is not a generic hobby marketplace. The current scope is RC only:

- Vehicles
- Components
- Drones
- Helicopters
- Planes
- Cars

The user explicitly asked to keep the UI and fields close to the original HTML while making the application production-oriented, dynamic, and role-based.

## Current Application State

This repository is a Next.js App Router application with Prisma/PostgreSQL persistence.

Git metadata is present in `D:\Coding\iHobbyWord`, but the repository may still contain many untracked files if no baseline commit has been made. Future agents should inspect `git status` before assuming which changes are theirs.

Core stack:

- Next.js 16
- React 19
- TypeScript
- Prisma 7 with `@prisma/adapter-pg`
- PostgreSQL
- First-party credential auth with database-backed sessions
- Optional Clerk auth integration
- Tailwind CSS
- Zod
- Vitest
- Lucide icons

The app is currently usable locally at:

```text
http://127.0.0.1:3001/
```

Port `3000` was occupied in this workspace, so development has been run on `3001`.

The current local PostgreSQL connection used during development is:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5434/ihobbyworld"
```

Database health endpoint:

```text
/api/health/database
```

Expected local result:

```json
{"connected":true,"label":"DB live","listingCount":12}
```

## Critical Product Decisions

- `iHobbyWorld.html` remains the visual/product reference.
- The rebuilt app is RC-only for now.
- Do not rebuild all hobbies from the old broad mockup.
- Do not reintroduce a role switcher in dashboards.
- First-party auth uses separate real accounts and writes session/product workflow data to the database.
- Clerk auth is optional and can be enabled with environment variables.
- Seller access is approval-based:
  - Buyer applies.
  - Admin approves.
  - User role becomes seller.
- Admin can inspect cross-marketplace operational data.
- Buyer/seller pages should be scoped to the signed-in account.
- Fallback static data is allowed only when PostgreSQL is unavailable.
- If a Prisma model exists, prefer DB-backed reads/writes over static arrays.

## Seeded Credentials

First-party credential auth is active when Clerk env vars are not set.

Seeded bootstrap accounts:

- Buyer: `buyer@ihobbyworld.local` / `Buyer@123`
- Seller: `seller@ihobbyworld.local` / `Seller@123`
- Admin: `admin@ihobbyworld.local` / `Admin@123`

Sign-in route:

```text
/sign-in
```

Cookie:

```text
ihw_session=<opaque session token>
```

Auth code:

- `src/lib/auth.ts`
- `src/lib/server/local-auth.ts`
- `src/lib/server/passwords.ts`
- `src/lib/rbac.ts`
- `src/lib/server/users.ts`

## Important Files

Primary server service:

```text
src/lib/server/marketplace.ts
```

This file handles most DB-backed reads and marketplace mutations.

Other important server files:

```text
src/lib/server/seller-applications.ts
src/lib/server/users.ts
src/lib/server/database-health.ts
src/lib/server/readiness.ts
src/lib/prisma.ts
src/lib/transactions.ts
src/lib/server/notifications.ts
src/lib/storage.ts
src/lib/email.ts
src/lib/ai/providers.ts
```

Important UI/routes:

```text
src/app/page.tsx
src/app/listings/[slug]/page.tsx
src/app/listings/[slug]/actions.ts
src/app/sell/new/page.tsx
src/app/sell/new/actions.ts
src/app/messages/page.tsx
src/app/messages/actions.ts
src/app/wallet/page.tsx
src/app/tools/build/page.tsx
src/app/tools/repair/page.tsx
src/app/tools/pricing/page.tsx
src/app/account/seller-application/page.tsx
src/app/admin/seller-applications/page.tsx
src/app/admin/audit/page.tsx
src/app/admin/categories/page.tsx
src/app/admin/users/page.tsx
src/app/api/health/readiness/route.ts
src/components/site-shell.tsx
src/components/ui.tsx
src/app/globals.css
```

Operational docs and smoke tooling:

```text
docs/DEPLOYMENT.md
docs/PROVIDER-SMOKE.md
scripts/smoke-workflows.ts
```

Database:

```text
prisma/schema.prisma
prisma/seed.ts
```

Tests:

```text
tests/marketplace-service.test.ts
tests/seller-applications-service.test.ts
tests/seller-application.test.ts
tests/listing-validation.test.ts
tests/transactions.test.ts
tests/rbac.test.ts
tests/auth.test.ts
tests/ai-provider.test.ts
tests/api-health-route.test.ts
tests/api-readiness-route.test.ts
tests/users-service.test.ts
tests/marketplace-admin-actions.test.ts
tests/readiness.test.ts
tests/storage.test.ts
```

## Implemented Features

### Marketplace

- Main marketplace reads listings from PostgreSQL.
- Vehicle and component sections match the RC mockup scope.
- Counts are dynamic from DB listings.
- Vehicle families:
  - drones
  - helis
  - planes
  - cars
- Component families are modeled in `rcScope` fallback and counted from listing attributes.

### Listings

- Listing detail pages render DB-backed listing data.
- Bid history is DB-backed.
- Server actions support:
  - placing bids
  - making offers
  - watchlist saves
  - messaging seller
- New seller listings are created as `PENDING_REVIEW`.

### Roles and Dashboards

- Buyer dashboard has DB-backed metrics.
- Seller dashboard has DB-backed inventory/offers/metrics.
- Admin dashboard has DB-backed reports and metrics.
- Navigation counts are DB-backed per role.

### Seller Applications

Previously the local flow bypassed the DB. That was fixed.

Current behavior:

- Buyer submits seller application.
- It writes to `SellerApplication`.
- Admin approves/rejects in DB.
- Approval updates Prisma user role to `SELLER`.
- If Clerk is configured, approval also updates Clerk metadata.

Files:

```text
src/lib/server/seller-applications.ts
src/app/account/seller-application/actions.ts
src/app/admin/seller-applications/actions.ts
```

### Wallet

Credits/wallet now reads from `CreditLedgerEntry`.

Seeded ledger examples:

- buyer balance: 542 credits
- seller balance: 1840 credits
- admin balance: 9999 credits

No real payment provider is connected yet.

### Build Tool

`/tools/build` reads from:

- `BuildConfiguration`
- `BuildPart`

Seed includes a 5 inch freestyle quad with parts and summary metrics.

### Repair Tool

`/tools/repair` reads from:

- `RepairSession`

Buyer, seller, and admin views are role-scoped:

- buyer sees buyer repair sessions
- seller sees seller repair sessions
- admin sees all repair sessions

### Pricing Tool

`/tools/pricing` reads comparable sales from:

- `PricingComparable`

Pricing range is calculated from persisted comparables.

### Messages

This was recently fixed.

Current behavior:

- `/messages` lists conversations from DB.
- It renders full persisted message rows from `Message`.
- It no longer uses hardcoded chat bubbles.
- It has a server action to create new messages.
- Admin can see all conversations.
- Buyers/sellers see only conversations where they are participants.
- Admin can send into a conversation and is added as a participant when needed.

Files:

```text
src/app/messages/page.tsx
src/app/messages/actions.ts
src/lib/server/marketplace.ts
```

Seed includes deterministic buyer/seller and admin/seller conversations.

### Notifications and Email

Notifications are persisted in `Notification`, rendered in the shell bell and `/notifications`, and exposed through `/api/notifications` for read/unread updates.

Email delivery goes through `src/lib/email.ts`:

- SMTP is used when `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` are configured.
- Without SMTP config, actions log mock email events and do not block user workflows.

### Media Uploads

`/api/upload` accepts seller/admin image uploads and stores them through `src/lib/storage.ts`.

- Without storage env vars, files are saved under `public/uploads/listings`.
- With `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, and `STORAGE_BUCKET`, the app uploads to an S3-compatible endpoint.

### Admin Operations

Admin screens are DB-backed:

- `/admin/listings` approves/rejects listings and resolves/dismisses reports.
- `/admin/reports` shows moderation reports.
- `/admin/seller-applications` approves/rejects seller applications.
- `/admin/users` edits user profiles, roles, and account statuses including `CLOSED`.
- `/admin/categories` creates, edits, deactivates, and reactivates categories, including inactive categories.
- `/admin/audit` reads persisted `AuditLog` rows instead of static sample data.

### Readiness And Smoke Checks

- `/api/health/readiness` returns an admin-only non-payment readiness report for database, auth, storage, SMTP, and AI provider configuration.
- `npm run smoke:workflows` checks public marketplace pages, buyer pages, seller pages, admin pages, database health, readiness health, AI pricing, and notification read behavior against a running first-party credential auth server.
- Provider and deployment runbooks live in `docs/PROVIDER-SMOKE.md` and `docs/DEPLOYMENT.md`.

### AI

AI provider abstraction:

```text
src/lib/ai/providers.ts
```

Supported providers:

- `mock`
- `groq`
- `deepseek`
- `huggingface`

API routes:

```text
POST /api/ai/listing-assistant
POST /api/ai/pricing
```

Both enforce role permission `ai:use`, validate with Zod, and use rate limiting.

## Prisma Models

Important models in `prisma/schema.prisma`:

- `User`
- `HobbyCategory`
- `Listing`
- `ListingMedia`
- `Bid`
- `Offer`
- `WatchlistItem`
- `Conversation`
- `ConversationParticipant`
- `Message`
- `Report`
- `ModerationAction`
- `AiJob`
- `LoyaltyEvent`
- `CreditLedgerEntry`
- `BuildConfiguration`
- `BuildPart`
- `RepairSession`
- `PricingComparable`
- `AuditLog`
- `SellerApplication`

## Seed Data

Run:

```bash
npm run db:seed
```

Seed creates:

- admin, seller, buyer users
- RC categories
- 4 vehicle listings
- 5 component listings
- bid and offer rows
- watchlist row
- wallet ledger rows
- build configuration and parts
- repair sessions
- pricing comparables
- reports
- seller application
- conversations and messages
- audit log entry

## Commands

Install:

```bash
npm install
```

Prisma:

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:seed
```

Use `npm run db:migrate:deploy` for production or CI deployments.

Dev server:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Validation:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

With the dev server running:

```bash
npm run smoke:workflows
```

Latest known validation at handoff:

- `npm test`: 19 files, 68 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run smoke:workflows`: passed against `http://127.0.0.1:3001`.

## Known Gaps Before Real Production

These are still not complete production integrations:

- Real payment provider for credits, bid holds, payouts, refunds, disputes.
- External-provider smoke tests for the target production environment: Clerk, SMTP, S3-compatible storage, and selected AI provider.
- Payment-grade wallet ledger reconciliation.
- Search indexing beyond current DB filtering for larger-scale catalogs.

## Development Rules for Future Agents

- Read code before changing it.
- Use `rg` for search.
- Keep UI close to the supplied mockup style.
- Do not add broad non-RC hobbies unless user explicitly changes scope.
- Prefer existing server service patterns.
- Use server actions for mutations.
- Keep role/ownership checks server-side.
- Do not add non-persistent product flows when a Prisma model exists.
- If adding data-backed UI, seed deterministic records.
- Add focused tests for service logic and validation.
- Run at least targeted tests plus typecheck for code changes.

## Common Pitfalls Already Fixed

- Seller application used to bypass the DB in local mode. Fixed.
- Messages page used to show hardcoded chat bubbles. Fixed.
- Wallet/build/repair/pricing tools used to show static arrays. Fixed.
- Button text contrast issue with black buttons was fixed through `.btn-primary`.
- Prisma config and seed load `.env.local`, so DB commands use the local configured URL.

## If Something Looks Static

Check the page first, then check `src/lib/server/marketplace.ts`.

Known fallback data lives in:

```text
src/lib/data.ts
```

Fallback should only show when the DB is unavailable or no row exists. If a page is still importing `src/lib/data.ts` directly for primary display, it likely needs to be moved to a server service.

Useful search:

```bash
rg "from \"@/lib/data\"|const .* = \\[" src/app src/lib/server
```

## Current Local Verification Snippets

Health:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/health/database
```

Sign in as buyer in a PowerShell web session:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -Uri http://127.0.0.1:3001/api/auth/sign-in -Method Post -Body @{email='buyer@ihobbyworld.local'; password='Buyer@123'} -WebSession $session
Invoke-WebRequest -Uri http://127.0.0.1:3001/messages -WebSession $session
```

Sign in as admin:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -Uri http://127.0.0.1:3001/api/auth/sign-in -Method Post -Body @{email='admin@ihobbyworld.local'; password='Admin@123'} -WebSession $session
Invoke-WebRequest -Uri http://127.0.0.1:3001/dashboard/admin -WebSession $session
```
