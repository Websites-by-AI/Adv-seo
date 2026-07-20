#!/usr/bin/env python3
"""Clinic Signal — dependency-free local server and safe public-site SEO auditor."""
from __future__ import annotations

import base64
import hashlib
import ipaddress
import json
import os
import re
import smtplib
import socket
import ssl
import time
from collections import defaultdict, deque
from email.message import EmailMessage
from html.parser import HTMLParser
from io import BytesIO
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote_plus, urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parent
MAX_BODY = 2_000_000
USER_AGENT = "ClinicSignalAudit/1.1 (+public-business-seo-audit)"
SEND_ENABLED = os.getenv("SEND_ENABLED", "false").lower() == "true"
DRY_RUN = os.getenv("DRY_RUN", "true").lower() != "false"
SEND_LOG: deque[dict] = deque(maxlen=100)
RATE_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
ALLOWED_CHANNELS = {"whatsapp", "telegram", "bale", "rubika", "soroush", "eitaa", "email", "sms", "divar"}
try:
    from PIL import Image, ImageDraw, ImageFont
    PILLOW_AVAILABLE = True
except Exception:
    PILLOW_AVAILABLE = False


def public_url(url: str) -> tuple[bool, str]:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return False, "Only public http/https URLs are allowed."
        if parsed.username or parsed.password:
            return False, "Credentials in URLs are not allowed."
        host = parsed.hostname.lower().rstrip(".")
        if host in {"localhost", "localhost.localdomain"} or host.endswith(".local"):
            return False, "Local hosts are blocked."
        infos = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80))
        for info in infos:
            ip = ipaddress.ip_address(info[4][0])
            if not ip.is_global:
                return False, "Private, loopback and link-local destinations are blocked."
        return True, ""
    except Exception as exc:
        return False, f"Could not validate host: {type(exc).__name__}"


class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        absolute = urljoin(req.full_url, newurl)
        ok, reason = public_url(absolute)
        if not ok:
            raise URLError(f"Unsafe redirect blocked: {reason}")
        return super().redirect_request(req, fp, code, msg, headers, absolute)


class AuditParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.title = ""
        self.description = ""
        self.h1: list[str] = []
        self.canonical = ""
        self.lang = ""
        self.viewport = False
        self.og_title = False
        self.schema_blocks = 0
        self.schema_types: set[str] = set()
        self.links: set[str] = set()
        self.text_chars = 0
        self.phone_signal = False
        self.address_signal = False
        self.map_or_social_signal = False
        self._in_title = False
        self._in_h1 = False
        self._in_schema = False
        self._buf: list[str] = []

    @staticmethod
    def attrs_dict(attrs):
        return {str(k).lower(): (v or "") for k, v in attrs}

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        a = self.attrs_dict(attrs)
        if tag == "html":
            self.lang = a.get("lang", "")
        elif tag == "title":
            self._in_title = True
            self._buf = []
        elif tag == "h1":
            self._in_h1 = True
            self._buf = []
        elif tag == "meta":
            name = a.get("name", "").lower()
            prop = a.get("property", "").lower()
            if name == "description" and not self.description:
                self.description = a.get("content", "").strip()
            if name == "viewport":
                self.viewport = True
            if prop == "og:title":
                self.og_title = True
        elif tag == "link" and "canonical" in a.get("rel", "").lower():
            self.canonical = a.get("href", "").strip()
        elif tag == "script" and "ld+json" in a.get("type", "").lower():
            self._in_schema = True
            self._buf = []
            self.schema_blocks += 1
        elif tag == "a" and a.get("href"):
            href = urljoin(self.base_url, a["href"])
            parsed = urlparse(href)
            if parsed.scheme in {"http", "https"}:
                self.links.add(href.split("#", 1)[0])
            raw = a["href"].lower()
            if any(x in raw for x in ("instagram.com", "maps.google", "goo.gl/maps", "wa.me", "t.me")):
                self.map_or_social_signal = True

    def handle_endtag(self, tag):
        tag = tag.lower()
        text = " ".join("".join(self._buf).split())
        if tag == "title" and self._in_title:
            self.title = text
            self._in_title = False
        elif tag == "h1" and self._in_h1:
            if text:
                self.h1.append(text)
            self._in_h1 = False
        elif tag == "script" and self._in_schema:
            for typ in re.findall(r'"@type"\s*:\s*"([^"]+)"', text):
                self.schema_types.add(typ)
            self._in_schema = False
        self._buf = []

    def handle_data(self, data):
        clean = " ".join(data.split())
        if clean:
            self.text_chars += len(clean)
            low = clean.lower()
            if re.search(r'(?:\+?98|0)?21[-\s]?\d{5,8}', clean) or re.search(r'09\d{9}', clean):
                self.phone_signal = True
            if any(x in low for x in ("تهران", "آدرس", "address", "خیابان", "street")):
                self.address_signal = True
        if self._in_title or self._in_h1 or self._in_schema:
            self._buf.append(data)


def fetch(url: str, timeout: int = 14, limit: int = MAX_BODY):
    ok, reason = public_url(url)
    if not ok:
        raise ValueError(reason)
    opener = build_opener(SafeRedirect())
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    started = time.monotonic()
    try:
        with opener.open(req, timeout=timeout) as response:
            final_url = response.geturl()
            ok, reason = public_url(final_url)
            if not ok:
                raise ValueError(f"Unsafe final URL: {reason}")
            body = response.read(limit + 1)
            if len(body) > limit:
                body = body[:limit]
            content_type = response.headers.get("Content-Type", "")
            charset = response.headers.get_content_charset() or "utf-8"
            text = body.decode(charset, errors="replace")
            return int(response.status), final_url, text, content_type, round(time.monotonic() - started, 2)
    except HTTPError as exc:
        try:
            body = exc.read(min(limit, 200_000)).decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return int(exc.code), exc.geturl(), body, exc.headers.get("Content-Type", ""), round(time.monotonic() - started, 2)


def endpoint_exists(url: str, endpoint: str) -> bool:
    try:
        status, _, text, content_type, _ = fetch(urljoin(url, endpoint), timeout=7, limit=400_000)
        if status != 200:
            return False
        head = text[:2000].lower()
        if endpoint == "robots.txt":
            return "user-agent" in head or "sitemap:" in head
        return "<urlset" in head or "<sitemapindex" in head
    except Exception:
        return False


def score_audit(status: int, final_url: str, p: AuditParser, robots: bool, sitemap: bool):
    score = 0
    issues: list[str] = []
    wins: list[str] = []

    if status == 200:
        score += 25
        wins.append("Homepage is reachable with HTTP 200")
    else:
        issues.append(f"Homepage returned HTTP {status}")

    if 20 <= len(p.title) <= 65:
        score += 5
    else:
        issues.append("Title is missing or outside the useful 20–65 character range")
    if 70 <= len(p.description) <= 170:
        score += 5
    else:
        issues.append("Meta description is missing or outside the useful range")
    if len(p.h1) == 1:
        score += 5
    else:
        issues.append(f"Expected one H1; found {len(p.h1)}")
    if p.canonical:
        score += 4
    else:
        issues.append("Canonical tag was not found")
    if p.viewport:
        score += 3
    else:
        issues.append("Mobile viewport tag was not found")
    if p.schema_blocks:
        score += 4
        wins.append("Structured data was detected")
    else:
        issues.append("No JSON-LD structured data was detected")
    if p.og_title:
        score += 2

    if p.text_chars >= 1800:
        score += 10
    elif p.text_chars >= 700:
        score += 6
    else:
        issues.append("Homepage has little crawlable text")
    if len(p.links) >= 20:
        score += 10
    elif len(p.links) >= 8:
        score += 6
    else:
        issues.append("Internal linking appears thin")

    if robots:
        score += 6
    else:
        issues.append("A valid robots.txt was not confirmed")
    if sitemap:
        score += 6
    else:
        issues.append("A valid sitemap.xml was not confirmed")
    if final_url.startswith("https://"):
        score += 3
    else:
        issues.append("Final page is not HTTPS")

    medical = any(x.lower() in {"medicalclinic", "medicalbusiness", "physician", "dermatology"} for x in p.schema_types)
    if p.phone_signal:
        score += 5
    else:
        issues.append("Public phone signal was not detected on the homepage")
    if p.address_signal:
        score += 5
    else:
        issues.append("Address/location signal was not detected")
    if medical or p.map_or_social_signal:
        score += 5
    else:
        issues.append("Medical entity or map/social identity signal is weak")

    return min(100, score), issues[:8], wins[:5]


def audit(url: str):
    if not urlparse(url).scheme:
        url = "https://" + url.strip()
    started = time.monotonic()
    status, final_url, html, content_type, elapsed = fetch(url)
    if "html" not in content_type.lower() and "<html" not in html[:1000].lower():
        raise ValueError("The URL did not return an HTML page.")
    parser = AuditParser(final_url)
    parser.feed(html)
    robots = endpoint_exists(final_url, "robots.txt")
    sitemap = endpoint_exists(final_url, "sitemap.xml")
    score, issues, wins = score_audit(status, final_url, parser, robots, sitemap)
    return {
        "ok": True,
        "requestedUrl": url,
        "status": status,
        "finalUrl": final_url,
        "elapsedSeconds": elapsed,
        "totalSeconds": round(time.monotonic() - started, 2),
        "title": parser.title,
        "titleLength": len(parser.title),
        "description": parser.description,
        "descriptionLength": len(parser.description),
        "h1Count": len(parser.h1),
        "h1": parser.h1[:3],
        "canonical": parser.canonical,
        "lang": parser.lang,
        "schemaTypes": sorted(parser.schema_types),
        "internalLinks": len(parser.links),
        "textCharacters": parser.text_chars,
        "robots": robots,
        "sitemap": sitemap,
        "seoScore": score,
        "issues": issues,
        "wins": wins,
        "checkedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "disclaimer": "Single-route public audit. Recheck timeouts and availability from the target market."
    }


def provider_status():
    """Return configuration state without exposing credentials."""
    providers = {
        "whatsapp": bool(os.getenv("WHATSAPP_TOKEN") and os.getenv("WHATSAPP_PHONE_NUMBER_ID")),
        "telegram": bool(os.getenv("TELEGRAM_BOT_TOKEN")),
        "bale": bool(os.getenv("BALE_BOT_TOKEN")),
        "rubika": bool(os.getenv("RUBIKA_BOT_TOKEN")),
        "soroush": bool(os.getenv("SOROUSH_PARTNER_WEBHOOK_URL")),
        "eitaa": bool(os.getenv("EITAA_APP_TOKEN")),
        "email": bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM")),
        "sms": bool(os.getenv("SMS_WEBHOOK_URL")),
        "divar": bool(os.getenv("DIVAR_PARTNER_WEBHOOK_URL")),
    }
    divar_slug = re.sub(r"[^a-zA-Z0-9_-]", "", os.getenv("DIVAR_APP_SLUG", ""))
    return {
        "ok": True,
        "sendEnabled": SEND_ENABLED,
        "dryRun": DRY_RUN,
        "providers": providers,
        "vendorSearchConfigured": bool(os.getenv("VENDOR_SEARCH_WEBHOOK_URL")),
        "proposalPdfMode": "direct-download" if PILLOW_AVAILABLE else "browser-print",
        "webApps": {
            "bale": "https://web.bale.ai",
            "rubika": "https://web.rubika.ir",
            "soroush": "https://web.splus.ir",
            "eitaa": "https://web.eitaa.com",
            "divar": f"https://divar.ir/chat/addon_{divar_slug}" if divar_slug else "https://divar.ir/",
        },
        "notes": {
            "whatsapp": "Official Meta Cloud API; opt-in and template/session rules apply.",
            "telegram": "The user must start the bot first, or the bot must have channel/group permission.",
            "bale": "Official Bale Bot API; the user must start the bot or authorize the conversation.",
            "rubika": "Official Rubika Bot API v3; chat_id and bot authorization are required.",
            "soroush": "Uses an operator-authorized Soroush Plus partner webhook.",
            "eitaa": "Uses the Eitaa application sendMessage API; token and permitted chat_id are required.",
            "email": "SMTP credentials remain server-side.",
            "sms": "Uses an approved provider webhook configured by the operator.",
            "divar": "Automatic sending is available only through an authorized Divar partner webhook; no scraping or browser automation.",
        },
    }


def rate_limit(channel: str, recipient: str):
    """Small-process safety limit: 5 sends/minute per channel+recipient, 30/minute total."""
    now = time.monotonic()
    keys = [f"recipient:{channel}:{hashlib.sha256(recipient.encode()).hexdigest()[:16]}", "global"]
    limits = [5, 30]
    for key, limit in zip(keys, limits):
        bucket = RATE_BUCKETS[key]
        while bucket and now - bucket[0] > 60:
            bucket.popleft()
        if len(bucket) >= limit:
            raise ValueError("Rate limit reached. Wait before sending again.")
    for key in keys:
        RATE_BUCKETS[key].append(now)


def post_json(url: str, payload: dict, headers: dict | None = None, timeout: int = 20):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    hdr = {"User-Agent": USER_AGENT, "Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        hdr.update(headers)
    req = Request(url, data=body, headers=hdr, method="POST")
    opener = build_opener(SafeRedirect())
    try:
        with opener.open(req, timeout=timeout) as response:
            raw = response.read(500_000).decode("utf-8", errors="replace")
            try:
                data = json.loads(raw)
            except Exception:
                data = {"raw": raw[:1000]}
            return int(response.status), data
    except HTTPError as exc:
        raw = exc.read(200_000).decode("utf-8", errors="replace")
        raise ValueError(f"Provider HTTP {exc.code}: {raw[:500]}")


def post_multipart(url: str, fields: dict, file_field: str, filename: str, content_type: str,
                   file_bytes: bytes, headers: dict | None = None, timeout: int = 30):
    boundary = "----ClinicSignal" + hashlib.sha256(os.urandom(16)).hexdigest()[:24]
    chunks: list[bytes] = []
    for key, value in fields.items():
        chunks.extend([f"--{boundary}\r\n".encode(),
                       f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(),
                       str(value).encode("utf-8"), b"\r\n"])
    chunks.extend([f"--{boundary}\r\n".encode(),
                   f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"\r\n'.encode(),
                   f"Content-Type: {content_type}\r\n\r\n".encode(), file_bytes, b"\r\n",
                   f"--{boundary}--\r\n".encode()])
    body = b"".join(chunks)
    hdr = {"User-Agent": USER_AGENT, "Accept": "application/json",
           "Content-Type": f"multipart/form-data; boundary={boundary}"}
    if headers:
        hdr.update(headers)
    req = Request(url, data=body, headers=hdr, method="POST")
    opener = build_opener(SafeRedirect())
    try:
        with opener.open(req, timeout=timeout) as response:
            raw = response.read(500_000).decode("utf-8", errors="replace")
            try:
                data = json.loads(raw)
            except Exception:
                data = {"raw": raw[:1000]}
            return int(response.status), data
    except HTTPError as exc:
        raw = exc.read(200_000).decode("utf-8", errors="replace")
        raise ValueError(f"Provider HTTP {exc.code}: {raw[:500]}")


def send_email(recipient: str, message: str, subject: str, attachment: bytes | None = None,
               attachment_name: str = "proposal.pdf"): 
    host = os.getenv("SMTP_HOST")
    sender = os.getenv("SMTP_FROM")
    if not host or not sender:
        raise ValueError("Email provider is not configured.")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    use_ssl = os.getenv("SMTP_SSL", "false").lower() == "true"
    email = EmailMessage()
    email["From"] = sender
    email["To"] = recipient
    email["Subject"] = subject or "Clinic Signal message"
    email.set_content(message)
    if attachment:
        email.add_attachment(attachment, maintype="application", subtype="pdf", filename=attachment_name)
    if use_ssl:
        smtp = smtplib.SMTP_SSL(host, port, timeout=20, context=ssl.create_default_context())
    else:
        smtp = smtplib.SMTP(host, port, timeout=20)
        if os.getenv("SMTP_STARTTLS", "true").lower() != "false":
            smtp.starttls(context=ssl.create_default_context())
    try:
        if user:
            smtp.login(user, password)
        smtp.send_message(email)
    finally:
        smtp.quit()
    return {"accepted": True}


def send_message(payload: dict):
    channel = str(payload.get("channel", "")).lower().strip()
    recipient = str(payload.get("recipient", "")).strip()
    message = str(payload.get("message", "")).strip()
    subject = str(payload.get("subject", "")).strip()
    if channel not in ALLOWED_CHANNELS:
        raise ValueError("Unsupported channel.")
    if not recipient or not message:
        raise ValueError("Recipient and message are required.")
    if len(message) > 4000:
        raise ValueError("Message is longer than 4000 characters.")
    if payload.get("approved") is not True:
        raise ValueError("Human approval is required before sending.")
    if payload.get("consent") is not True:
        raise ValueError("Documented recipient consent or an existing service conversation is required.")
    if payload.get("senderAuthorized") is not True:
        raise ValueError("Authorization to represent the selected sender company is required.")
    if payload.get("doNotContact") is True:
        raise ValueError("Recipient is on the do-not-contact list.")
    rate_limit(channel, recipient)

    recipient_hash = hashlib.sha256(recipient.encode("utf-8")).hexdigest()[:16]
    log = {"time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "channel": channel,
           "recipientHash": recipient_hash, "leadId": str(payload.get("leadId", ""))[:80]}
    pdf_bytes = None
    pdf_filename = "proposal.pdf"
    requested_attachment = payload.get("attachProposalPdf") is True
    attach_pdf = requested_attachment and channel in {"whatsapp", "telegram", "bale", "email"}
    manual_attachment_required = requested_attachment and not attach_pdf
    if attach_pdf:
        proposal = payload.get("proposal") if isinstance(payload.get("proposal"), dict) else None
        if not proposal:
            raise ValueError("Proposal data is required for a PDF attachment.")
        pdf_bytes, pdf_filename = make_proposal_pdf(proposal)

    if DRY_RUN or not SEND_ENABLED:
        log.update(status="simulated", attachment=bool(pdf_bytes))
        SEND_LOG.appendleft(log)
        return {"ok": True, "sent": False, "dryRun": True, "status": "simulated",
                "attachmentReady": bool(pdf_bytes), "manualAttachmentRequired": manual_attachment_required,
                "message": "Validated successfully. Sending is disabled or DRY_RUN is active."}

    if manual_attachment_required:
        raise ValueError("Automatic PDF attachment is not configured for this channel. Download the PDF and use the official web app handoff.")
    configured = provider_status()["providers"]
    if not configured[channel]:
        raise ValueError(f"{channel.title()} provider is not configured.")

    if channel == "whatsapp":
        token = os.environ["WHATSAPP_TOKEN"]
        phone_id = os.environ["WHATSAPP_PHONE_NUMBER_ID"]
        version = os.getenv("WHATSAPP_API_VERSION", "v23.0")
        url = f"https://graph.facebook.com/{version}/{phone_id}/messages"
        auth = {"Authorization": f"Bearer {token}"}
        status, text_response = post_json(url, {"messaging_product": "whatsapp", "to": re.sub(r"\D", "", recipient),
                    "type": "text", "text": {"preview_url": False, "body": message}}, auth)
        response = {"text": text_response}
        if pdf_bytes:
            media_url = f"https://graph.facebook.com/{version}/{phone_id}/media"
            _, media_response = post_multipart(media_url, {"messaging_product": "whatsapp"}, "file",
                                                pdf_filename, "application/pdf", pdf_bytes, auth)
            media_id = media_response.get("id") if isinstance(media_response, dict) else None
            if not media_id:
                raise ValueError("WhatsApp media upload did not return a media id.")
            doc_status, doc_response = post_json(url, {"messaging_product": "whatsapp",
                "to": re.sub(r"\D", "", recipient), "type": "document",
                "document": {"id": media_id, "filename": pdf_filename}}, auth)
            status = doc_status
            response["document"] = doc_response
    elif channel == "telegram":
        token = os.environ["TELEGRAM_BOT_TOKEN"]
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        status, text_response = post_json(url, {"chat_id": recipient, "text": message, "disable_web_page_preview": True})
        response = {"text": text_response}
        if pdf_bytes:
            doc_url = f"https://api.telegram.org/bot{token}/sendDocument"
            doc_status, doc_response = post_multipart(doc_url, {"chat_id": recipient}, "document",
                                                       pdf_filename, "application/pdf", pdf_bytes)
            status = doc_status
            response["document"] = doc_response
    elif channel == "bale":
        token = os.environ["BALE_BOT_TOKEN"]
        base = f"https://tapi.bale.ai/bot{token}"
        status, text_response = post_json(base + "/sendMessage", {"chat_id": recipient, "text": message})
        response = {"text": text_response}
        if pdf_bytes:
            doc_status, doc_response = post_multipart(base + "/sendDocument", {"chat_id": recipient},
                                                       "document", pdf_filename, "application/pdf", pdf_bytes)
            status = doc_status
            response["document"] = doc_response
    elif channel == "rubika":
        token = os.environ["RUBIKA_BOT_TOKEN"]
        url = f"https://botapi.rubika.ir/v3/{token}/sendMessage"
        status, response = post_json(url, {"chat_id": recipient, "text": message})
    elif channel == "soroush":
        url = os.environ["SOROUSH_PARTNER_WEBHOOK_URL"]
        token = os.getenv("SOROUSH_PARTNER_TOKEN", "")
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        status, response = post_json(url, {"recipient": recipient, "message": message}, headers)
    elif channel == "eitaa":
        status, response = post_json("https://eitaayar.ir/api/app/sendMessage", {
            "token": os.environ["EITAA_APP_TOKEN"], "chat_id": recipient, "text": message})
    elif channel == "email":
        response = send_email(recipient, message, subject, pdf_bytes, pdf_filename)
        status = 200
    elif channel == "sms":
        url = os.environ["SMS_WEBHOOK_URL"]
        headers = {"Authorization": f"Bearer {os.getenv('SMS_WEBHOOK_TOKEN', '')}"} if os.getenv("SMS_WEBHOOK_TOKEN") else {}
        status, response = post_json(url, {"to": recipient, "message": message,
                                            "sender": os.getenv("SMS_SENDER", "")}, headers)
    elif channel == "divar":  # Authorized Kenar-e-Divar middleware only
        url = os.environ["DIVAR_PARTNER_WEBHOOK_URL"]
        headers = {"Authorization": f"Bearer {os.getenv('DIVAR_PARTNER_TOKEN', '')}"} if os.getenv("DIVAR_PARTNER_TOKEN") else {}
        status, response = post_json(url, {"conversation_id": recipient, "message": message,
                                           "app_slug": os.getenv("DIVAR_APP_SLUG", "")}, headers)
    else:
        raise ValueError("Channel adapter is not implemented.")

    log.update(status="sent", providerStatus=status)
    SEND_LOG.appendleft(log)
    return {"ok": True, "sent": True, "dryRun": False, "status": "sent", "providerStatus": status,
            "providerResponse": response}


def search_vendors(payload: dict):
    """Use an operator-configured public-search adapter; never scrape search engines directly."""
    query = str(payload.get("query", "")).strip()[:300]
    location = str(payload.get("location", "Tehran")).strip()[:100]
    categories = payload.get("categories") or []
    if not query:
        raise ValueError("Search query is required.")
    if not isinstance(categories, list):
        categories = []
    categories = [str(x)[:80] for x in categories[:8]]
    webhook = os.getenv("VENDOR_SEARCH_WEBHOOK_URL", "")
    token = os.getenv("VENDOR_SEARCH_WEBHOOK_TOKEN", "")
    if webhook:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        status, response = post_json(webhook, {"query": query, "location": location,
                                               "categories": categories, "limit": 12}, headers)
        items = response.get("items", []) if isinstance(response, dict) else []
        clean = []
        for item in items[:12]:
            if not isinstance(item, dict):
                continue
            clean.append({
                "name": str(item.get("name", ""))[:160],
                "website": str(item.get("website", ""))[:500],
                "category": str(item.get("category", ""))[:100],
                "location": str(item.get("location", ""))[:120],
                "evidence": str(item.get("evidence", item.get("source", "")))[:500],
                "phone": str(item.get("phone", ""))[:80],
                "summary": str(item.get("summary", ""))[:500],
                "verified": bool(item.get("verified", False)),
            })
        return {"ok": True, "configured": True, "providerStatus": status, "items": clean,
                "disclaimer": "Search results are candidates, not endorsements. Verify scope, references and credentials."}
    text = f"{query} {location}".strip()
    return {
        "ok": True,
        "configured": False,
        "items": [],
        "searchLinks": {
            "google": "https://www.google.com/search?q=" + quote_plus(text),
            "linkedin": "https://www.linkedin.com/search/results/companies/?keywords=" + quote_plus(text),
        },
        "disclaimer": "No search adapter is configured. Use the generated public-search links or add candidates manually.",
    }


def make_proposal_pdf(payload: dict) -> tuple[bytes, str]:
    """Create a real A4 PDF with Pillow/RAQM; browser print remains the fallback."""
    if not PILLOW_AVAILABLE:
        raise ValueError("Direct PDF rendering is unavailable; use browser Print / Save as PDF.")
    lead = payload.get("lead") if isinstance(payload.get("lead"), dict) else {}
    def val(source, key, default="", limit=1500):
        return str(source.get(key, default))[:limit]
    name = val(lead, "name", "Clinic")
    agency_profile = payload.get("agencyProfile") if isinstance(payload.get("agencyProfile"), dict) else {}
    agency = val(agency_profile, "name", val(payload, "agency", "Clinic Signal Partner", 160), 160)
    agency_phone = val(agency_profile, "phone", "", 80)
    agency_website = val(agency_profile, "website", "", 300)
    agency_email = val(agency_profile, "email", "", 200)
    agency_address = val(agency_profile, "address", "", 500)
    agency_hours = val(agency_profile, "hours", "", 200)
    logo_data = val(agency_profile, "logoData", "", 900_000)
    issue = val(lead, "issue", "Technical and organic growth opportunity")
    tech = val(lead, "tech", "Public technical audit pending")
    plan = val(lead, "plan", "Technical remediation, local landing pages and conversion tracking")
    target = val(lead, "target", "Service + location search clusters")
    package = val(lead, "package", "Growth package", 160)
    priority = val(lead, "priority", "P2", 10)
    validity = val(payload, "validity", "14 days", 80)
    setup = val(payload, "setup", "—", 120)
    monthly = val(payload, "monthly", "—", 120)
    media = val(payload, "media", "—", 120)
    duration = val(payload, "duration", "—", 120)
    try:
        seo = max(0, min(100, int(lead.get("seo", 0))))
        opportunity = max(0, min(100, int(lead.get("opportunity", 0))))
    except Exception:
        seo = opportunity = 0

    W, H = 1240, 1754
    image = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(image)
    regular_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    bold_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    layout = ImageFont.Layout.RAQM if hasattr(ImageFont, "Layout") else None
    regular = lambda n: ImageFont.truetype(regular_path, n, layout_engine=layout)
    bold = lambda n: ImageFont.truetype(bold_path, n, layout_engine=layout)
    f_small, f_body, f_bold, f_h2, f_title = regular(19), regular(23), bold(23), bold(30), bold(40)
    ink, muted, teal, pale, amber = "#183247", "#64748b", "#00a69c", "#f2f7f9", "#fff7e2"
    left, right = 82, W - 82

    def text_rtl(x, y, text, font, fill=ink, anchor="ra"):
        kwargs = {"font": font, "fill": fill, "anchor": anchor}
        try:
            draw.text((x, y), text, direction="rtl", language="fa", **kwargs)
        except TypeError:
            draw.text((x, y), text, **kwargs)

    def measure(text, font):
        try:
            return draw.textlength(text, font=font, direction="rtl", language="fa")
        except TypeError:
            return draw.textlength(text, font=font)

    def paragraph(text, y, font=f_body, fill=muted, max_width=None, line_height=37, max_lines=5):
        max_width = max_width or (right-left)
        words = str(text).split()
        lines, line = [], ""
        for word in words:
            candidate = (line + " " + word).strip()
            if measure(candidate, font) <= max_width:
                line = candidate
            else:
                if line:
                    lines.append(line)
                line = word
                if len(lines) >= max_lines:
                    break
        if line and len(lines) < max_lines:
            lines.append(line)
        if len(lines) == max_lines and len(words) > sum(len(x.split()) for x in lines):
            lines[-1] = lines[-1].rstrip("…") + "…"
        for line in lines:
            text_rtl(right, y, line, font, fill)
            y += line_height
        return y

    def heading(text, y):
        draw.rectangle((right-7, y-4, right, y+33), fill=teal)
        text_rtl(right-18, y, text, f_h2, ink)
        return y + 52

    # Header and sender logo
    logo_box = (right-92, 58, right, 142)
    logo_drawn = False
    if logo_data.startswith("data:image/") and ";base64," in logo_data:
        try:
            raw = base64.b64decode(logo_data.split(",", 1)[1], validate=True)
            logo_img = Image.open(BytesIO(raw)).convert("RGBA")
            logo_img.thumbnail((88, 78))
            px = right - 46 - logo_img.width//2
            py = 100 - logo_img.height//2
            image.paste(logo_img, (px, py), logo_img)
            logo_drawn = True
        except Exception:
            logo_drawn = False
    if not logo_drawn:
        draw.rounded_rectangle(logo_box, radius=16, fill="#12364d")
        text_rtl(right-46, 87, agency[:3], f_bold, "white", anchor="mm")
    text_rtl(right-112, 67, agency, f_h2, ink)
    text_rtl(right-112, 107, "پیشنهاد رشد ارگانیک و زیرساخت دیجیتال", f_small, muted)
    contact_line = " · ".join(x for x in (agency_phone, agency_website) if x)
    if contact_line:
        text_rtl(right-112, 137, contact_line, regular(15), muted)
    text_rtl(left, 78, time.strftime("%Y-%m-%d"), f_small, muted, anchor="la")
    text_rtl(left, 110, f"اعتبار: {validity}", f_small, muted, anchor="la")
    draw.rectangle((left, 158, right, 163), fill=teal)

    y = 190
    text_rtl(right, y, f"پیشنهاد اختصاصی برای {name}", f_title, ink)
    y += 68
    y = paragraph("این سند براساس بررسی عمومی حضور دیجیتال و وضعیت فنی مشاهده‌شده تهیه شده است. برآورد مقیاس به معنی درآمد واقعی یا توان پرداخت قطعی نیست.", y, f_body, muted, max_lines=3)
    y += 20

    # Score cards
    gap = 18
    box_w = (right-left-2*gap)//3
    cards = [("بلوغ SEO", f"{seo}/100"), ("فرصت", f"{opportunity}/100"), ("پکیج", package)]
    for i, (label, value) in enumerate(cards):
        x1 = right - (i+1)*box_w - i*gap
        x2 = x1 + box_w
        draw.rounded_rectangle((x1, y, x2, y+112), radius=16, fill=pale)
        text_rtl(x2-18, y+20, label, f_small, muted)
        text_rtl(x2-18, y+56, value, f_bold if i<2 else f_small, ink)
    text_rtl(left+16, y+17, priority, f_bold, "#a52d2d", anchor="la")
    y += 145

    y = heading("یافته و فرصت اصلی", y)
    y = paragraph("مشاهده فنی: " + tech, y, max_lines=3)
    y = paragraph("فرصت: " + issue, y+5, max_lines=3)
    y = paragraph("خوشه هدف: " + target, y+5, max_lines=2)
    y += 12

    y = heading("راهکار و برنامه ۹۰روزه", y)
    y = paragraph(plan, y, max_lines=3)
    phases = [
        ("روز ۱–۳۰", "Baseline، دسترسی‌ها و رفع ریسک فنی"),
        ("روز ۳۱–۶۰", "صفحات پول‌ساز، Schema و محتوای پزشکی"),
        ("روز ۶۱–۹۰", "CRO، Digital PR و گزارش لید"),
    ]
    phase_y = y + 10
    for i, (title, desc) in enumerate(phases):
        x1 = right - (i+1)*box_w - i*gap
        x2 = x1 + box_w
        draw.rounded_rectangle((x1, phase_y, x2, phase_y+105), radius=14, outline="#dce6ee", width=2)
        text_rtl(x2-14, phase_y+14, title, f_bold, ink)
        paragraph(desc, phase_y+50, f_small, muted, max_width=box_w-28, line_height=28, max_lines=2)
    y = phase_y + 130

    y = heading("سرمایه‌گذاری پیشنهادی", y)
    prices = [("راه‌اندازی", setup), ("حق‌الزحمه ماهانه", monthly), ("رسانه مستقیم", media), ("دوره", duration)]
    for label, value in prices:
        draw.line((left, y+35, right, y+35), fill="#dce6ee", width=1)
        text_rtl(right, y, label, f_body, muted)
        text_rtl(left, y, value, f_bold, ink, anchor="la")
        y += 43
    y += 12

    y = heading("KPI و شرایط حقوقی", y)
    y = paragraph("KPIها: دسترس‌پذیری، Core Web Vitals، رشد صفحات هدف، سهم Top 10، تماس و فرم واجدشرایط، نرخ تبدیل و در صورت اتصال CRM درآمد منتسب.", y, f_small, muted, line_height=31, max_lines=3)
    draw.rounded_rectangle((left, y+8, right, min(H-92, y+160)), radius=14, fill=amber, outline="#f0dfa8")
    paragraph("هیچ رتبه مطلق یا جایگاه ۱ تضمین نمی‌شود. تعهد مجری بر Deliverable، SLA، کیفیت فنی و KPIهای قابل‌اندازه‌گیری است. ادعاهای پزشکی فقط پس از تأیید پزشک مسئول منتشر می‌شود و جبران خدمت صرفاً طبق قرارداد خواهد بود.", y+24, f_small, "#725a20", max_width=right-left-34, line_height=30, max_lines=4)
    sender_footer = " · ".join(x for x in (agency, agency_phone, agency_email, agency_website) if x)
    address_footer = " · ".join(x for x in (agency_address, agency_hours) if x)
    if address_footer:
        text_rtl(right, H-112, address_footer, regular(13), muted)
    if sender_footer:
        text_rtl(right, H-86, sender_footer, regular(14), muted)
    text_rtl(right, H-58, "پیش‌نویس تجاری — نیازمند قرارداد و تأیید نهایی طرفین", regular(15), muted)

    output = BytesIO()
    image.save(output, format="PDF", resolution=150.0, title=f"Proposal for {name}", author=agency)
    safe_name = re.sub(r"[^A-Za-z0-9_-]+", "-", val(lead, "id", "clinic", 80)).strip("-") or "clinic"
    return output.getvalue(), f"proposal-{safe_name}.pdf"


class Handler(SimpleHTTPRequestHandler):
    server_version = "ClinicSignal/1.1"

    def translate_path(self, path):
        clean = urlparse(path).path.lstrip("/") or "index.html"
        target = (ROOT / clean).resolve()
        if ROOT not in target.parents and target != ROOT:
            return str(ROOT / "index.html")
        return str(target)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self' data: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self'")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            return self.json_response({"ok": True, "service": "Clinic Signal", "mode": "live-audit-and-messaging"})
        if path == "/api/integrations":
            return self.json_response(provider_status())
        if path == "/api/send-log":
            return self.json_response({"ok": True, "items": list(SEND_LOG)})
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in {"/api/audit", "/api/send", "/api/vendor-search", "/api/proposal-pdf"}:
            return self.json_response({"ok": False, "error": "Not found"}, 404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            request_limit = 2_000_000 if path in {"/api/proposal-pdf", "/api/send"} else 30_000
            if length <= 0 or length > request_limit:
                raise ValueError("Invalid request size")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if path == "/api/proposal-pdf":
                pdf, filename = make_proposal_pdf(payload)
                self.send_response(200)
                self.send_header("Content-Type", "application/pdf")
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
                self.send_header("Content-Length", str(len(pdf)))
                self.end_headers()
                self.wfile.write(pdf)
                return
            if path == "/api/send":
                return self.json_response(send_message(payload))
            if path == "/api/vendor-search":
                return self.json_response(search_vendors(payload))
            url = str(payload.get("url", "")).strip()
            if not url:
                raise ValueError("URL is required")
            return self.json_response(audit(url))
        except (ValueError, URLError, HTTPError, socket.timeout, TimeoutError) as exc:
            return self.json_response({"ok": False, "error": str(exc), "type": type(exc).__name__}, 400)
        except Exception as exc:
            label = "Send" if path == "/api/send" else "Vendor search" if path == "/api/vendor-search" else "Proposal PDF" if path == "/api/proposal-pdf" else "Audit"
            return self.json_response({"ok": False, "error": f"{label} failed: {type(exc).__name__}: {exc}"}, 500)


def main():
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Clinic Signal running at http://{host}:{port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
