# Security and Deployment Report

## Verified

- Next.js 16.2.6 production build passes.
- TypeScript passes.
- Vercel routes compile.
- International exhibition page and API compile.
- npm production dependency audit: 0 known vulnerabilities at verification time.
- `DATABASE_URL` is server-only.
- Optional Basic Auth proxy protects all pages and APIs.
- Build-time database mutation is disabled by default.
- `AUTO_MIGRATE=true` is required to opt in to Drizzle schema push.

## Vercel

```text
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: empty
Install Command: npm install
```

Required:

```text
DATABASE_URL
```

Recommended for a private deployment:

```text
APP_BASIC_USER
APP_BASIC_PASSWORD
AUTO_MIGRATE=false
```

## Hugging Face

Use a Docker Space. The included Dockerfile serves port 7860.

Secrets:

```text
DATABASE_URL
APP_BASIC_USER
APP_BASIC_PASSWORD
```

## Database migration

Preferred one-time command from a trusted machine:

```bash
npm run db:push
```

Optional first production deploy:

```text
AUTO_MIGRATE=true
```

After the schema is created, return it to `false`.

## Remaining production work

- Replace Basic Auth with real users/roles for multi-user use.
- Add API rate limiting.
- Add CSRF/session controls.
- Add database backups.
- Restrict exhibition source scraping and respect provider terms.
- Add a durable job queue for high-volume audits.
