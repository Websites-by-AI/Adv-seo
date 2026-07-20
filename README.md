# Leadfar

Leadfar is a Persian, RTL lead-operations application for finding SEO sales opportunities, auditing public websites, recommending service packages, and preparing personalized outreach.

## Included workflows

- Public landing / home page with feature overview and channel status
- Persian lead dashboard with search and P1-P3 prioritization
- Automated opportunity scoring and package recommendation
- Live homepage SEO audits through `/api/audit`
- Technical-risk overrides for SSL, redirect chains, DNS failures, and 5xx errors that force the lead to P1
- Offline demo audit fallback when the Vercel API is unavailable
- Multichannel communications workspace:
  - WhatsApp Business (Meta Cloud API) — [web.whatsapp.com](https://web.whatsapp.com/)
  - Telegram (Bot API) — [web.telegram.org](https://web.telegram.org/)
  - Bale (Bot API) — [bale.ai](https://bale.ai/) / [web.bale.ai](https://web.bale.ai/)
  - Rubika (Bot API) — [rubika.ir](https://rubika.ir/) / [web.rubika.ir](https://web.rubika.ir/)
  - Soroush Plus (Bot API) — [soroushplus.com](https://soroushplus.com/) / [web.splus.ir](https://web.splus.ir/)
  - Eitaa (Eitaa Yar webhook or manual) — [eitaa.com](https://eitaa.com/) / [web.eitaa.com](https://web.eitaa.com/)
  - Divar Chat (partner Chat API or manual) — [divar.ir](https://divar.ir/)
  - Email (SMTP)
  - SMS (approved provider webhook)
  - Divar Ads (authorized partner webhook or manual handoff)
- Editable per-channel message, recipient, email subject
- **PDF proposal → public link** for WhatsApp: one-tap uploads the generated PDF to a public host (or your own server storage) and auto-injects the link into the message
- Mobile-first responsive layout with iOS/Android safe-area, tap-targets, and no zoom-on-focus for inputs
- Mandatory human approval + recipient consent before dispatch
- Client-side rate limit of 20 messages / minute
- Hashed send-log (SHA-256, truncated) persisted in `localStorage`
- Safe **Dry Run** enabled by default
- Automatic phone formatting to E.164 for WhatsApp and SMS
- Settings panel showing per-channel connection status and expected env vars
- CSV and JSON export
- Browser persistence with `localStorage`
- Add a single lead manually or import from manual lists, HTML, or a demo exhibition URL workflow
- Printable SEO proposals

## Environment variables (Vercel)

Set these in **Project Settings → Environment Variables**. Nothing is stored in the browser.

| Channel | Required variables |
|---|---|
| WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` |
| Telegram | `TELEGRAM_BOT_TOKEN` |
| Bale | `BALE_BOT_TOKEN` |
| Rubika | `RUBIKA_BOT_TOKEN` |
| Soroush Plus | `SOROUSH_BOT_TOKEN` |
| Eitaa | `EITAA_TOKEN` |
| Divar Chat | `DIVAR_CHAT_TOKEN` (only with an authorized partner agreement) |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| SMS | `SMS_WEBHOOK_URL`, `SMS_API_KEY` |
| Divar Ads | `DIVAR_PARTNER_URL`, `DIVAR_API_KEY` (only with an authorized partner agreement) |
| PDF Host (optional) | `BLOB_READ_WRITE_TOKEN` (Vercel Blob), or `R2_*` (Cloudflare R2), or `S3_*` (AWS S3). If none are set, the client falls back to a public temporary host (tmpfiles.org, 1-hour expiry). |

Global toggles:

- `DRY_RUN=true` (default) — server never actually delivers messages, just logs them
- `SEND_ENABLED=true` — required to enable real dispatch

`/api/integrations` reports which channels are configured. `/api/send` accepts POST payloads only when `approved=true` and `consent=true`. All Divar interactions require the official partner API — the project never scrapes Divar; without partner access the panel falls back to copy-and-open manual handoff.

## Live audit checks

- HTTP status and redirects
- HTTPS
- Title and meta description
- H1
- Canonical link
- JSON-LD structured data
- Internal links
- `robots.txt`
- `sitemap.xml`
- Public phone signal

The API rejects localhost, private IP ranges, credentials in URLs, non-HTTP protocols, and non-standard ports. Every redirect target is checked again before it is fetched.

## Run locally

```bash
npm install
npm run dev
```

The Vite preview uses demo audit data because Vercel functions are not started by the Vite development server. All other interface features remain functional.

## Deploy to Vercel

Import the repository into Vercel and keep the detected Vite settings:

- Build command: `npm run build`
- Output directory: `dist`
- Framework preset: Vite

Vercel automatically deploys `api/audit.js` and `api/health.js` as serverless functions. The `/bids` and `/compare` routes are rewritten to the SPA entry in `vercel.json`.

## Score limits

The live score is a homepage technical and on-page SEO score. Google rank values in the demo are estimates. Accurate location-based rankings require a SERP provider, and Search Console data requires authorization from each website owner.