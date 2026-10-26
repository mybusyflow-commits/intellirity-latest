"""Measure responsive layout at real phone/tablet/desktop viewports.

Launches headless Chrome, drives CDP, and reports horizontal overflow plus
undersized tap targets for each page at each width. Saves screenshots.

Usage:
    python scripts/check_mobile.py
    python scripts/check_mobile.py --base http://localhost:3000
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

try:
    import websocket  # websocket-client
except ImportError:
    print("error: pip install websocket-client", file=sys.stderr)
    raise SystemExit(2)

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]

VIEWPORTS = [
    ("small-android", 360, 800, 3),
    ("iphone-12", 390, 844, 3),
    ("tablet", 768, 1024, 2),
    ("desktop", 1280, 800, 1),
]
PAGES = ["/", "/engines", "/pricing", "/security"]

PROBE = r"""
(() => {
  const vw = window.innerWidth;
  const de = document.documentElement;
  const offenders = [];
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Ignore intentionally scrollable containers and off-canvas decorations.
    if (cs.position === 'fixed' && (cs.ariaHidden === 'true')) continue;
    if (r.right > vw + 1.5 || r.left < -1.5) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 110),
        right: Math.round(r.right),
        left: Math.round(r.left),
        w: Math.round(r.width),
        text: (el.textContent || '').trim().slice(0, 60),
      });
    }
  }
  const small = [];
  for (const el of document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="tab"]')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.width < 24 || r.height < 24) {
      small.push({
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width), h: Math.round(r.height),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      });
    }
  }
  return {
    viewportWidth: vw,
    innerHeight: window.innerHeight,
    scrollWidth: de.scrollWidth,
    overflow: de.scrollWidth > vw + 1,
    overflowPx: Math.max(0, de.scrollWidth - vw),
    offenders: offenders.slice(0, 12),
    offenderCount: offenders.length,
    smallTargets: small.slice(0, 12),
    smallTargetCount: small.length,
    title: document.title,
  };
})()
"""


def chrome_path() -> str:
    for p in CHROME_CANDIDATES:
        if Path(p).exists():
            return p
    raise SystemExit("No Chrome or Edge found")


def http_json(url: str):
    with urllib.request.urlopen(url, timeout=10) as r:
        return json.loads(r.read().decode())


def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://localhost:3000")
    parser.add_argument("--out", default=str(Path(os.environ.get("TEMP", tempfile.gettempdir())) / "intellirity-mobile"))
    args = parser.parse_args(argv)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    profile = Path(tempfile.mkdtemp(prefix="intellirity-cdp-"))
    port = 9333

    proc = subprocess.Popen(
        [
            chrome_path(),
            "--headless=new",
            f"--remote-debugging-port={port}",
            f"--user-data-dir={profile}",
            "--no-first-run",
            "--no-default-browser-check",
            "--remote-allow-origins=*",
            "--disable-gpu",
            "--hide-scrollbars",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    ws = None
    try:
        for _ in range(40):
            try:
                targets = http_json(f"http://127.0.0.1:{port}/json")
                page = next(t for t in targets if t["type"] == "page")
                break
            except Exception:
                time.sleep(0.25)
        else:
            raise SystemExit("Chrome did not expose a debugging target")

        ws = websocket.create_connection(page["webSocketDebuggerUrl"], timeout=30)
        msg_id = 0

        def send(method, params=None):
            nonlocal msg_id
            msg_id += 1
            ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
            while True:
                doc = json.loads(ws.recv())
                if doc.get("id") == msg_id:
                    if "error" in doc:
                        raise RuntimeError(doc["error"])
                    return doc.get("result", {})

        send("Page.enable")
        send("Runtime.enable")

        failures = 0
        print(f"base: {args.base}\n")
        for name, width, height, dpr in VIEWPORTS:
            send(
                "Emulation.setDeviceMetricsOverride",
                {
                    "width": width,
                    "height": height,
                    "deviceScaleFactor": dpr,
                    "mobile": width < 768,
                },
            )
            for path in PAGES:
                send("Page.navigate", {"url": args.base + path})
                for _ in range(80):
                    time.sleep(0.1)
                    state = send(
                        "Runtime.evaluate",
                        {"expression": "document.readyState", "returnByValue": True},
                    ).get("result", {}).get("value")
                    if state == "complete":
                        break
                # let fonts and the first paint settle
                time.sleep(0.6)
                res = send(
                    "Runtime.evaluate",
                    {"expression": PROBE, "returnByValue": True, "awaitPromise": False},
                ).get("result", {}).get("value") or {}

                overflow = res.get("overflow")
                small = res.get("smallTargetCount", 0)
                status = "PASS"
                if overflow:
                    status = "FAIL"
                    failures += 1
                print(
                    f"[{status}] {name:<13} {path:<10} "
                    f"scroll={res.get('scrollWidth')}/{res.get('viewportWidth')} "
                    f"overflow={res.get('overflowPx')}px "
                    f"offenders={res.get('offenderCount')} smallTargets={small}"
                )
                for o in res.get("offenders", [])[:5]:
                    print(f"         > {o['tag']}.{o['cls'][:52]} right={o['right']} w={o['w']}")
                for t in res.get("smallTargets", [])[:5]:
                    print(f"         ~ tap {t['tag']} {t['w']}x{t['h']} {t['text']}")

            for path in ["/", "/pricing"]:
                send("Page.navigate", {"url": args.base + path})
                for _ in range(80):
                    time.sleep(0.1)
                    state = send(
                        "Runtime.evaluate",
                        {"expression": "document.readyState", "returnByValue": True},
                    ).get("result", {}).get("value")
                    if state == "complete":
                        break
                time.sleep(0.6)
                shot = send("Page.captureScreenshot", {"format": "png"})
                fname = out / f"{name}{path.replace('/', '-') or '-home'}.png"
                fname.write_bytes(base64.b64decode(shot["data"]))
            print()

        print(f"RESULT: {failures} viewport/page combination(s) with horizontal overflow")
        print(f"screenshots: {out}")
        return 0 if failures == 0 else 1
    finally:
        if ws is not None:
            ws.close()
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    raise SystemExit(main())
