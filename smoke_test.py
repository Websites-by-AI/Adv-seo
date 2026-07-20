#!/usr/bin/env python3
"""Dependency-free smoke tests for Clinic Signal."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
PORT = 8765
BASE = f"http://127.0.0.1:{PORT}"


def get(path):
    with urlopen(BASE + path, timeout=10) as r:
        return r.status, r.read().decode("utf-8")


def post(path, payload):
    body = json.dumps(payload).encode()
    req = Request(BASE + path, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(req, timeout=35) as r:
            return r.status, json.loads(r.read())
    except HTTPError as exc:
        return exc.code, json.loads(exc.read())


def post_raw(path, payload):
    body = json.dumps(payload).encode()
    req = Request(BASE + path, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(req, timeout=35) as r:
        return r.status, r.headers.get("Content-Type", ""), r.read()


def wait_ready():
    for _ in range(40):
        try:
            if get("/api/health")[0] == 200:
                return
        except Exception:
            time.sleep(0.1)
    raise RuntimeError("Server did not start")


def main():
    env = dict(os.environ, PORT=str(PORT), HOST="127.0.0.1")
    proc = subprocess.Popen([sys.executable, "server.py"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        wait_ready()
        status, health = get("/api/health")
        assert status == 200 and json.loads(health)["ok"] is True
        print("PASS health endpoint")

        status, html = get("/")
        assert status == 200 and "Clinic Signal" in html and "ایجنت ممیزی" in html
        assert "WhatsApp Business" in html and "DIVAR_PARTNER_WEBHOOK_URL" in html
        assert "سازنده پیشنهاد PDF" in html and "یافتن شرکت مناسب" in html
        assert 'static/app.js' in html and 'static/styles.css' in html
        assert '<script>' not in html and '<style>' not in html
        assert "https://cdn" not in html and "fonts.googleapis" not in html
        js_status, js = get("/static/app.js")
        css_status, css = get("/static/styles.css")
        assert js_status == 200 and "function printProposal" in js and "function renderPartners" in js
        assert css_status == 200 and ".proposal-page" in css and ".channel-card" in css
        print("PASS clean split frontend: HTML, CSS and JavaScript assets")

        status, integrations = get("/api/integrations")
        integrations = json.loads(integrations)
        assert status == 200 and integrations["dryRun"] is True
        assert set(integrations["providers"]) == {"whatsapp", "telegram", "bale", "rubika", "soroush", "eitaa", "email", "sms", "divar"}
        assert integrations["webApps"]["bale"] == "https://web.bale.ai" and integrations["webApps"]["eitaa"] == "https://web.eitaa.com"
        print("PASS server-side integration status")

        status, vendor_search = post("/api/vendor-search", {"query": "SEO and web security company", "location": "Tehran", "categories": ["seo", "security"]})
        assert status == 200 and vendor_search["ok"] is True
        assert vendor_search["configured"] is False and "google" in vendor_search["searchLinks"]
        print("PASS safe vendor-search fallback")

        if integrations.get("proposalPdfMode") == "direct-download":
            status, content_type, pdf = post_raw("/api/proposal-pdf", {
                "agency": "Clinic Signal Partner", "agencyProfile": {"name": "سئوف", "phone": "02166902605", "website": "https://seof.ir", "email": "info@seof.ir", "address": "تهران، خیابان جمالزاده جنوبی", "hours": "شنبه تا چهارشنبه", "logoData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n3sAAAAASUVORK5CYII="}, "validity": "14 days", "setup": "35M", "monthly": "45M", "media": "12M", "duration": "9 months",
                "lead": {"id": "test", "name": "کلینیک آزمایشی", "seo": 55, "opportunity": 70, "priority": "P1", "package": "رشد منطقه‌ای", "tech": "خطای فنی نمونه", "issue": "نیاز به اصلاح سئو و زیرساخت", "plan": "رفع فنی و ساخت صفحات محلی", "target": "کلینیک زیبایی تهران"}
            })
            assert status == 200 and "application/pdf" in content_type and pdf.startswith(b"%PDF") and len(pdf) > 5000
            print(f"PASS direct Persian proposal PDF ({len(pdf)} bytes)")

        status, denied = post("/api/send", {"channel": "email", "recipient": "test@example.com", "message": "Hello"})
        assert status == 400 and denied["ok"] is False
        print("PASS consent and approval enforcement")

        status, simulated = post("/api/send", {"channel": "email", "recipient": "test@example.com", "message": "Hello", "subject": "Test", "consent": True, "approved": True, "senderAuthorized": True})
        assert status == 200 and simulated["ok"] is True and simulated["dryRun"] is True and simulated["sent"] is False
        print("PASS safe dry-run delivery")

        for channel in ("bale", "rubika", "soroush", "eitaa", "divar"):
            status, simulated_local = post("/api/send", {"channel": channel, "recipient": "test-chat-id", "message": "Approved local-channel test", "consent": True, "approved": True, "senderAuthorized": True})
            assert status == 200 and simulated_local["dryRun"] is True
        print("PASS Bale, Rubika, Soroush+, Eitaa and Divar dry-run adapters")

        if integrations.get("proposalPdfMode") == "direct-download":
            status, simulated_pdf = post("/api/send", {"channel": "whatsapp", "recipient": "989121234567", "message": "Approved test", "consent": True, "approved": True, "senderAuthorized": True, "attachProposalPdf": True,
                "proposal": {"agency": "سئوف", "agencyProfile": {"name": "سئوف", "phone": "02166902605"}, "lead": {"id": "test-send", "name": "کلینیک آزمایشی", "seo": 50, "opportunity": 70, "priority": "P1", "package": "رشد", "tech": "خطای نمونه", "issue": "رفع فنی", "plan": "برنامه ۹۰روزه", "target": "تهران"}}})
            assert status == 200 and simulated_pdf["attachmentReady"] is True and simulated_pdf["dryRun"] is True
            print("PASS dry-run WhatsApp PDF attachment generation")

        status, blocked = post("/api/audit", {"url": "http://127.0.0.1:1/private"})
        assert status == 400 and blocked["ok"] is False
        print("PASS private-address protection")

        status, live = post("/api/audit", {"url": "https://example.com/"})
        assert status == 200 and live["ok"] is True
        assert live["status"] == 200 and 0 <= live["seoScore"] <= 100
        assert "issues" in live and "checkedAt" in live
        print(f"PASS live public audit (score={live['seoScore']})")

        print("ALL SMOKE TESTS PASSED")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=4)
        except subprocess.TimeoutExpired:
            proc.kill()
        if proc.stdout:
            output = proc.stdout.read().strip()
            if output:
                print("\nServer log:\n" + output)


if __name__ == "__main__":
    main()
