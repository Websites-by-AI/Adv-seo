# Clinic Signal — Clean Vercel Package

This directory contains only the files required by Vercel:

- `public/index.html` — frontend
- `api/index.py` — Flask serverless API
- `server.py` — shared audit/PDF/messaging logic
- `assets/fonts/` — Persian PDF fonts
- `requirements.txt` — Flask and Pillow
- `vercel.json` — routing, headers and function settings

Import this directory as a clean GitHub repository or select it as the Vercel Root Directory.

Required initial environment variables:

```text
SEND_ENABLED=false
DRY_RUN=true
PUBLIC_BASE_URL=https://YOUR-PROJECT.vercel.app
PDF_LINK_SECRET=LONG_RANDOM_SECRET_AT_LEAST_24_CHARACTERS
PDF_LINK_TTL_SECONDS=86400
```
