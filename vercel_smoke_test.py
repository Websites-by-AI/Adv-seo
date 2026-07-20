#!/usr/bin/env python3
"""Local contract test for the Vercel Flask entrypoint."""
import os
from pathlib import Path

os.environ.setdefault("PDF_LINK_SECRET", "test-secret-that-is-longer-than-24-characters")
os.environ.setdefault("DRY_RUN", "true")
os.environ.setdefault("SEND_ENABLED", "false")

from api.index import app

client = app.test_client()

r = client.get("/api/health")
assert r.status_code == 200 and r.json["mode"] == "vercel-serverless"
print("PASS Vercel health")

r = client.get("/api/integrations")
assert r.status_code == 200 and r.json["deployment"] == "vercel"
print("PASS Vercel integrations")

r = client.post("/api/clinic-search", json={"query": "sexual health medical clinic Tehran", "location": "Tehran", "specialty": "sexual-health", "engines": ["duckduckgo", "google"]})
assert r.status_code == 200 and "duckduckgo" in r.json["searchLinks"]
print("PASS Vercel medical-clinic discovery fallback")

proposal = {
    "agency": "سئوف",
    "agencyProfile": {"name": "سئوف", "phone": "02166902605", "website": "https://seof.ir"},
    "lead": {"id": "vercel-test", "name": "کلینیک آزمایشی", "seo": 50, "opportunity": 70,
             "priority": "P1", "package": "رشد", "tech": "ممیزی فنی", "issue": "بهبود سئو",
             "plan": "برنامه ۹۰روزه", "target": "تهران"},
}
r = client.post("/api/proposal-pdf", json=proposal)
assert r.status_code == 200 and r.data.startswith(b"%PDF")
print("PASS Vercel direct PDF")

r = client.post("/api/proposal-link", json=proposal)
assert r.status_code == 200 and "/api/shared-pdf?t=" in r.json["url"]
token = r.json["url"].split("?t=", 1)[1]
r = client.get("/api/shared-pdf?t=" + token)
assert r.status_code == 200 and r.data.startswith(b"%PDF")
print("PASS Vercel stateless signed PDF link")

r = client.post("/api/send", json={"channel": "email", "recipient": "test@example.com", "message": "test",
                                    "consent": True, "approved": True, "senderAuthorized": True})
assert r.status_code == 200 and r.json["dryRun"] is True
print("PASS Vercel safe send Dry Run")

assert Path("public/index.html").exists() and Path("vercel.json").exists()
print("ALL VERCEL CONTRACT TESTS PASSED")
