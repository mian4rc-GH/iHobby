# iHobbyWorld RC Product App Plan

## Summary

- Treat `iHobbyWorld.html` as the high-fidelity product/design reference, not production source.
- Rebuild the same RC marketplace workflows as a real full-stack web application.
- Scope is RC only for this version: vehicles and components for drones, helicopters, planes, and cars.
- Keep separate login flows and server-side roles for visitor, buyer, seller, and admin. No dashboard role switcher.
- Use a modern production stack: Next.js App Router, React, TypeScript, Prisma/PostgreSQL, Clerk-ready auth, Zod validation, Tailwind CSS, Vitest, and a swappable AI provider layer.
- V1 does not process real payments. Credits, bid holds, boosts, and payouts are modeled as product workflows and can connect to payments later.

## Product Screens

- Marketplace with the same top-level scope as the HTML:
  - Vehicles
  - Components
- Vehicle families:
  - Drones
  - Helicopters
  - Planes
  - Cars
- Component families:
  - Drone motors, ESCs, flight controllers, frames, VTX/video, cameras, batteries, props
  - Helicopter blades, motors, ESCs/governors, flybarless/gyro, swashplates, canopies, batteries
  - Plane servos, motors, ESCs, propellers/spinners, receivers, gas/glow engines
  - Car motors, ESCs, tires/wheels, shocks/suspension, diffs/drivetrain, chassis/body, batteries
- Listing detail with specs, seller verification, countdown, bid input, watch, message seller, and bid history.
- Create listing with RC scope, vehicle family, component type, title, condition, year, brand/model, proof, runtime, accessories, photos, auction settings, shipping, boost, and AI draft help.
- Buyer dashboard, seller dashboard, admin dashboard, watchlist, bids, offers, messages, credits/wallet, loyalty, build/configure, repair advisor, pricing engine, moderation, users, taxonomy, audit log, and seller approvals.

## Roles

- Visitor:
  - Browse public marketplace.
  - Sign in or sign up.
- Buyer:
  - Watch listings, bid, make offers, message sellers, use workshop tools, manage credits, apply to sell.
- Seller:
  - Create listings, manage inventory, respond to offers, use pricing and AI helpers, track credits/payouts.
- Admin:
  - Moderate listings/reports, approve sellers, manage users, manage RC taxonomy, inspect audit history.

## Implementation Details

- Routes:
  - `/` and `/marketplace`
  - `/listings/[slug]`
  - `/categories/[slug]`
  - `/dashboard/buyer`, `/dashboard/seller`, `/dashboard/admin`
  - `/sell/new`
  - `/messages`, `/watchlist`, `/offers`, `/bids`, `/wallet`, `/loyalty`
  - `/tools/build`, `/tools/repair`, `/tools/pricing`
  - `/account/seller-application`
  - `/admin/users`, `/admin/listings`, `/admin/seller-applications`, `/admin/categories`, `/admin/audit`
  - `/api/ai/*`, `/api/upload/*`, `/api/webhooks/clerk`, `/api/demo-session`, `/api/logout`
- Database:
  - Users, roles, seller applications, categories, listings, media, bids, offers, watchlists, messages, reports, moderation actions, AI jobs, loyalty events, wallet ledger, and audit logs.
  - Enforce ownership and role checks in server-side services.
- Auth:
  - Clerk in production.
  - Local demo fallback with separate buyer, seller, and admin accounts.
  - New signups default to buyer.
  - Seller access requires buyer application plus admin approval.
- AI:
  - Provider abstraction supports DeepSeek, Hugging Face, and mock mode.
  - AI assists with listing drafts, pricing ranges, build compatibility, and repair triage.

## Quality Gates

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
