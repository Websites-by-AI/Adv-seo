---
title: Adv SEO Exhibition Leads
emoji: 🌐
colorFrom: emerald
colorTo: amber
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Adv SEO — Next.js Exhibition Lead Operations

A coherent Next.js application for importing local and international exhibition exhibitors, discovering websites, checking search visibility, auditing websites, prioritizing SEO sales opportunities, generating proposals, comparing SERPs and requesting quotes from SEO vendors.

## Verified build

```text
Next.js 16.2.6
TypeScript passed
Production build passed
/international-exhibitions route included
/api/international-exhibitions route included
```

## Main modules

- Lead dashboard and pipeline
- Manual/HTML/sample company import
- International exhibition import with country, city, venue, dates, booth and industry
- Website discovery and public website audit
- First-page/SERP comparison with Google → DuckDuckGo → Bing fallback
- Opportunity scoring and package generation
- Printable SEO proposals
- SEO vendor/RFQ workflow
- PostgreSQL persistence through Drizzle ORM

## Local run

```bash
npm install
cp .env.example .env.local
# edit DATABASE_URL
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

International exhibitions:

```text
http://localhost:3000/international-exhibitions
```

## Database setup

The runtime auto-detects the first available connection variable:

```text
DATABASE_URL
POSTGRES_URL
SUPABASE_DB_URL
```

Example:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

### Recommended one-time setup

```bash
npm run db:push
```

### Optional automatic deploy migration

The build script supports an opt-in variable:

```text
AUTO_MIGRATE=true
```

When enabled, it runs:

```text
npx drizzle-kit push --force
```

before `next build`.

**Safety rule:** enable `AUTO_MIGRATE=true` only for the Production environment after a database backup. Do not enable it for untrusted Preview deployments. After the first successful schema deployment, set it back to `false` and use reviewed migrations for later changes.

An additive SQL migration for existing installations is available at:

```text
migrations/0001_international_exhibitions.sql
```

## Vercel deployment

Import the repository with:

```text
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: leave empty
Install Command: npm install
```

Required database connection — any one of these names works:

```text
DATABASE_URL
POSTGRES_URL
SUPABASE_DB_URL
```

Optional:

```text
AUTO_MIGRATE=false
GOOGLE_PLACES_API_KEY=
GOOGLE_MAPS_API_KEY=
APP_BASIC_USER=admin
APP_BASIC_PASSWORD=use-a-long-random-password
```

When both Basic Auth variables are set, all pages and APIs are protected by the Next.js proxy. If either is missing, authentication is disabled.

## Hugging Face Docker deployment

Create a Docker Space and upload the repository. The included Dockerfile builds Next.js standalone and serves port `7860`.

Space variables/secrets:

```text
DATABASE_URL=...
GOOGLE_PLACES_API_KEY=...   # optional
APP_BASIC_USER=admin
APP_BASIC_PASSWORD=use-a-long-random-password
```

The Docker image intentionally builds with `AUTO_MIGRATE=false`. Apply the database schema once from a trusted machine or CI before starting production.

## Cloudflare

Cloudflare Pages alone is not compatible with this full application because it uses Next.js server routes and PostgreSQL. Deployment would require an OpenNext/Cloudflare Workers adapter and additional database/network testing. Vercel or Hugging Face Docker is recommended.

## Security status

- Production dependency audit: 0 known runtime vulnerabilities at build time.
- Optional HTTP Basic Auth protects all pages and API routes through `src/proxy.ts`.
- The application remains intended for a private/internal sales team. For multi-user public production, replace Basic Auth with session-based accounts and roles.

Before making it broadly public:

1. Add per-user authentication and roles.
2. Keep all mutation APIs (`POST`, `PATCH`, `DELETE`) behind authenticated sessions.
3. Add CSRF/session validation.
4. Add rate limits for import, audit and SERP routes.
5. Store API keys only as server secrets.
6. Keep database credentials server-only.
7. Restrict exhibition-source fetching and respect robots/terms.
8. Add audit logs and backups.

Do not expose the current administrative API anonymously on a public production domain.
