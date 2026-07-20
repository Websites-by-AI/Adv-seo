---
title: Clinic Signal
emoji: 🏥
colorFrom: teal
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: other
---

# Clinic Signal

A self-contained lead-operations website for Tehran beauty clinics. It includes a public home page and turns public business data into an auditable workflow: verify → audit → score → prioritize → recommend a package → draft outreach → human approval → consent-controlled multichannel delivery.

## Run

```bash
cd clinic-lead-agent
python3 server.py
```

Open `http://127.0.0.1:8000`.

- Opening `index.html` directly runs the complete offline demo.
- Running `server.py` enables the real same-origin `/api/audit`, `/api/integrations` and `/api/send` endpoints.
- No Python or JavaScript packages are required for the browser-only demo. Server deployment installs Flask and Pillow from `requirements.txt`.
- For Vercel, deploy the repository root. Vercel serves `public/index.html` and loads the Flask app from `api/index.py`.
- See [`VERCEL_DEPLOYMENT.md`](VERCEL_DEPLOYMENT.md) for the deployment contract, signed PDF links and UI standards.

## Messaging configuration

Sending is safe by default: `DRY_RUN=true` and `SEND_ENABLED=false`. Every request also requires `consent=true` and `approved=true`.

```bash
# Enable real delivery only after provider credentials and compliance review
export SEND_ENABLED=true
export DRY_RUN=false
export PUBLIC_BASE_URL='https://YOUR_USERNAME-clinic-signal.hf.space'
export PDF_LINK_TTL_SECONDS='86400'

# WhatsApp Business Cloud API
export WHATSAPP_TOKEN='...'
export WHATSAPP_PHONE_NUMBER_ID='...'
export WHATSAPP_API_VERSION='v23.0'   # configurable

# Telegram Bot API
export TELEGRAM_BOT_TOKEN='...'

# Bale official Bot API (https://tapi.bale.ai)
export BALE_BOT_TOKEN='...'

# Rubika official Bot API v3
export RUBIKA_BOT_TOKEN='...'

# Soroush Plus authorized organizational/partner adapter
export SOROUSH_PARTNER_WEBHOOK_URL='https://authorized-adapter.example/send'
export SOROUSH_PARTNER_TOKEN='...'

# Eitaa application API
export EITAA_APP_TOKEN='...'

# Email
export SMTP_HOST='smtp.example.com'
export SMTP_PORT='587'
export SMTP_FROM='team@example.com'
export SMTP_USER='...'
export SMTP_PASSWORD='...'

# Approved SMS provider adapter
export SMS_WEBHOOK_URL='https://provider.example/send'
export SMS_WEBHOOK_TOKEN='...'
export SMS_SENDER='...'

# Divar: authorized partner access only; otherwise use manual handoff
export DIVAR_PARTNER_WEBHOOK_URL='https://your-authorized-kenar-divar-middleware.example/send'
export DIVAR_PARTNER_TOKEN='...'
export DIVAR_APP_SLUG='your_approved_app_slug'

# Optional public-company search adapter. It must return {"items": [...]}
export VENDOR_SEARCH_WEBHOOK_URL='https://search-adapter.example/vendors'
export VENDOR_SEARCH_WEBHOOK_TOKEN='...'
```

WhatsApp opt-in and template/session rules apply. A Telegram user must start the bot first. Divar scraping or browser automation is intentionally not implemented.

### WhatsApp and proposal attachments

- **Mobile:** opens `whatsapp://send` with the approved recipient and prefilled text.
- **Desktop Chrome:** opens `web.whatsapp.com/send` with the same approved text.
- **Shareable-link flow:** build a temporary PDF URL; the panel adds it to the WhatsApp message and copies it automatically.
- **Manual PDF flow:** download the generated proposal, open WhatsApp, then attach the local file. Browsers cannot silently attach a local document to a deep link.
- **Automatic PDF flow:** when the official WhatsApp Cloud API is configured, the server generates the PDF, uploads it to Meta as media and sends it as a document. Telegram Bot and SMTP email also support the generated PDF attachment.
- The sender-company authorization checkbox is mandatory. Do not use a real company's name or logo unless you are authorized to represent it.

### Iranian messenger web handoff

The panel copies the approved message and opens the official web app:

- Bale: `https://web.bale.ai`
- Rubika: `https://web.rubika.ir`
- Soroush Plus: `https://web.splus.ir`
- Eitaa: `https://web.eitaa.com`
- Divar: `https://divar.ir/`, or `https://divar.ir/chat/addon_{DIVAR_APP_SLUG}` for an approved Kenar-e-Divar chat add-on

API delivery is supported for Bale and Rubika bot tokens, Eitaa application tokens, an authorized Soroush Plus adapter, and authorized Kenar-e-Divar middleware. Web handoff does not silently send: it copies the text, opens the official web app and leaves the final recipient selection/attachment to the authorized operator.

## Default sender-company profiles

The default active profile is **Seof** with the supplied Tehran address, `02166902605`, `https://seof.ir`, `info@seof.ir`, WhatsApp `09106922361`, and Saturday–Wednesday 09:30–17:30 hours. Three additional public templates are included: Tehran Site, SEO Tehran and DMRoom. These profiles are conveniences, not proof of authorization. Upload an authorized PNG/JPEG/WebP logo for direct PDF rendering; the browser-print version can also display SVG.

## Proposal PDF and partner matching

The Proposal Studio builds an A4, RTL proposal for the selected clinic. Choose **Print / Save as PDF** and select the browser's PDF destination. This approach keeps the project dependency-free and preserves Persian shaping with the browser's installed fonts.

The partner registry contains public candidate companies with evidence URLs. Inclusion is not an endorsement and every seed entry is marked unverified. The matcher recommends relevant provider categories from the clinic's issue. If `VENDOR_SEARCH_WEBHOOK_URL` is not configured, the app generates public Google and LinkedIn company-search links instead of scraping results.

## Project structure

```text
clinic-lead-agent/
├── index.html                 # Arena-safe static homepage; no JavaScript
├── app.html                   # Full self-contained local/Docker application
├── index.source.html          # Maintainable full-app HTML source
├── build_standalone.py        # Rebuilds app.html and public/index.html
├── static/
│   ├── app.js                 # UI, scoring, proposals, partners and messaging
│   ├── styles.css             # Core dashboard styles
│   └── mobile-fixes.css       # Safe-area, phone, tablet and landscape fixes
├── public/index.html          # Vercel static frontend bundle
├── api/index.py               # Vercel Flask serverless API
├── assets/fonts/              # Bundled DejaVu fonts for Persian PDF
├── server.py                  # Local/Hugging Face server and shared logic
├── Dockerfile                 # Hugging Face Spaces / Docker deployment
├── vercel.json                # Vercel routing, headers and limits
├── requirements.txt           # Flask + Pillow
├── smoke_test.py              # Local/Hugging Face contract tests
├── vercel_smoke_test.py       # Vercel Flask API contract tests
├── DEPLOYMENT_BLUEPRINT.md    # Hugging Face/Docker blueprint
├── VERCEL_DEPLOYMENT.md       # Vercel-specific deployment and UI standard
├── sample-proposal-blue-dream.pdf
└── README.md                  # Hugging Face metadata and setup
```

## Product modules

1. **Public home page** — product positioning, workflow, feature overview and calls to action.
2. **Operations dashboard** — KPIs, urgent incidents, opportunity ranking and public-scale distribution.
3. **Lead database** — 19 seed leads, filters, search, local persistence, import/export and detailed lead drawer.
4. **Audit agent** — HTTP status, redirects, title, description, H1, canonical, viewport, JSON-LD, internal links, robots and sitemap.
5. **Scoring engine** — editable SEO-gap/public-scale weighting, priority P1–P3 and crisis override.
6. **Package engine** — Local Starter, Regional Growth, Tehran Enterprise and technical-recovery add-ons.
7. **Sender-company dashboard** — Seof is the default profile, with Tehran Site, SEO Tehran and DMRoom as additional public templates; contact fields and authorized logo upload are editable.
8. **Proposal/PDF studio** — clinic-specific audit, 90-day scope, pricing, KPIs, sender logo/contact block and legal terms; direct PDF plus browser-print fallback.
9. **Solution Partner Finder** — classifies the issue, recommends SEO/design/security/hosting/content/branding providers, matches an evidence-based vendor registry and supports a search adapter.
10. **Messaging center** — WhatsApp Mobile/Web/API, Telegram, Bale, Rubika, Soroush Plus, Eitaa, SMTP email, SMS and Kenar-e-Divar chat API/web handoff.
11. **Controlled automation** — local queue, scheduled items while the panel is open, dry-run mode, rate limits and hashed send logs.
12. **Compliance controls** — public business contacts only; consent and human approval required; no guaranteed Google rank, treatment result or unsupported revenue claim.

## Architecture

```text
Candidate URLs / imported JSON
              │
              ▼
     Browser operations UI
      │                 │
      │ offline         │ live same-origin
      ▼                 ▼
Saved evidence     POST /api/audit
and local rules           │
                          ▼
                 Safe URL validation
                 + redirect validation
                          │
                          ▼
              Public HTTP page inspection
                          │
                          ▼
                Deterministic SEO score
                          │
              ┌───────────┴──────────┐
              ▼                      ▼
       Package recommendation   Outreach draft
              └───────────┬──────────┘
                          ▼
                    Human approval
```

## Security and limits

- The audit API allows only public `http` and `https` destinations.
- Local, private, loopback and link-local IPs are blocked, including redirects.
- Response size is capped and timeouts are enforced.
- Message delivery is disabled by default and requires documented consent plus human approval per request.
- Lightweight per-recipient and global rate limits are enforced; production should add durable queues and organization-level suppression lists.
- Send logs hash recipients and never return provider credentials to the browser.
- A timeout from one route is not proof of universal downtime; retest from Iran and a second monitoring provider.
- Exact Google positions require a licensed SERP API configured for Tehran. Search Console requires clinic-owner authorization.
- Browser changes are stored in `localStorage`; export JSON for durable backup.

## Production adapters to add

The user interface already models the workflow. A production deployment can add these behind server-side adapters without exposing API keys in the browser:

- SERP/rank-tracking API with Tehran location and mobile/desktop profiles
- Google Search Console OAuth for consenting clients
- Google Places or Iranian map-directory verification
- CRM webhook after human approval
- PostgreSQL and user authentication
- Scheduled jobs and audit history

Do not place third-party API secrets in `index.html`.
