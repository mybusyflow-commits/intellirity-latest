"""Intellirity — Vibe Code Security static analysis engine.

Performs multi-pass static analysis of source code and URLs to surface
real, actionable vulnerabilities: exposed secrets, injection flaws,
insecure transport, weak cryptography, dangerous function calls, and more.
Each finding carries a CWE reference, severity, the offending line number,
and a concrete remediation.
"""
from __future__ import annotations

import ipaddress
import re
import socket
import urllib.error
import urllib.request
from typing import Any
from urllib.parse import urlparse

# Each rule: (id, title, severity, cwe, category, regex, remediation)
# Severity weights feed the composite risk score.
SECRET_RULES = [
    ("ics.secret.aws_key", "Hardcoded AWS Access Key", "critical", "CWE-798", "secrets",
     r"AKIA[0-9A-Z]{16}", "Remove the key and load it from a secret manager (AWS Secrets Manager / SSM)."),
    ("ics.secret.aws_secret", "Hardcoded AWS Secret", "critical", "CWE-798", "secrets",
     r"aws_secret_access_key\s*=\s*['\"][A-Za-z0-9/+=]{40}['\"]", "Move the secret to environment variables or a vault."),
    ("ics.secret.openai", "Exposed OpenAI API Key", "critical", "CWE-798", "secrets",
     r"sk-[A-Za-z0-9]{20,}", "Revoke the key and inject it at runtime from a secret store."),
    ("ics.secret.stripe", "Exposed Stripe Secret Key", "critical", "CWE-798", "secrets",
     r"sk_live_[A-Za-z0-9]+", "Rotate the key immediately; never ship live keys in code."),
    ("ics.secret.github", "Exposed GitHub Token", "critical", "CWE-798", "secrets",
     r"ghp_[A-Za-z0-9]{36}", "Revoke the token and use a scoped, short-lived credential."),
    ("ics.secret.google", "Exposed Google API Key", "critical", "CWE-798", "secrets",
     r"AIza[0-9A-Za-z\-_]{35}", "Restrict the key and store it server-side only."),
    ("ics.secret.private_key", "Embedded Private Key", "critical", "CWE-321", "secrets",
     r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----", "Never commit keys; load from a secure file or KMS."),
    ("ics.secret.jwt", "Hardcoded JWT", "high", "CWE-798", "secrets",
     r"eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", "Sign tokens at runtime; do not embed signed tokens in source."),
    ("ics.secret.assignment", "Hardcoded Credential Assignment", "high", "CWE-798", "secrets",
     r"(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|token)\s*[:=]\s*['\"][^'\"]{6,}['\"]",
     "Read credentials from environment or a secret manager instead of literals."),
    ("ics.secret.url_creds", "Credentials in URL", "high", "CWE-598", "secrets",
     r"""https?://[^/\s:@\"'{}]+:[^/\s:@\"'{}]+@[A-Za-z0-9.-]+""", "Avoid embedding credentials in URLs; use headers or token auth."),
]

INJECTION_RULES = [
    ("ics.sql.concat", "SQL Built via String Concatenation", "high", "CWE-89", "injection",
     r"(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b[^;]*(\+|%s\s*\+|f['\"]|format\(|['\"].*\+)", "Use parameterized queries / prepared statements exclusively."),
    ("ics.sql.format", "SQL via String Formatting", "high", "CWE-89", "injection",
     r"(?:execute|cursor\.execute|raw|query)\s*\([^)]*(\{|%s|%\(|f['\"]|\+)",
     "Parameterize all SQL; never interpolate user input into queries."),
    ("ics.xss.innerhtml", "Unsanitized HTML Injection (XSS)", "high", "CWE-79", "injection",
     r"innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\(|v-html",
     "Sanitize and escape user content; prefer text nodes over raw HTML."),
    ("ics.xss.eval", "Dynamic Evaluation of Untrusted Input", "high", "CWE-95", "injection",
     r"\beval\s*\(|\bexec\s*\(|\bFunction\s*\(",
     "Avoid eval/exec on dynamic input; use safe parsers or allowlists."),
    ("ics.cmd_injection", "Command Injection Risk", "critical", "CWE-78", "injection",
     r"os\.system\s*\(|subprocess[^)]*shell\s*=\s*True|child_process\.exec\s*\(|os\.popen\s*\(",
     "Avoid shell=True; pass arguments as lists and validate input."),
    ("ics.ssrf", "Server-Side Request Forgery (SSRF)", "high", "CWE-918", "injection",
     r"(?:requests\.(?:get|post)|urlopen|fetch|httpx\.)\s*\([^)]*(?:user|req\.|input|params|url)",
     "Validate and allowlist outbound URLs; block internal/metadata addresses."),
    ("ics.path_traversal", "Path Traversal", "high", "CWE-22", "injection",
     r"(\.\./|\.\.\\|/etc/passwd|%2e%2e)",
     "Canonicalize and confine file paths; reject traversal sequences."),
    ("ics.deserialization", "Insecure Deserialization", "critical", "CWE-502", "injection",
     r"pickle\.loads|yaml\.load\s*\(|jsonpickle|marshal\.loads|unserialize\(",
     "Use safe serialization (JSON) and never deserialize untrusted data."),
]

CONFIG_RULES = [
    ("ics.crypto.weak", "Weak Cryptographic Primitive", "high", "CWE-327", "crypto",
     r"\bmd5\s*\(|\bsha1\s*\(|DES\b|RC4\b|ecb",
     "Use SHA-256+ or AEAD (AES-GCM); avoid MD5/SHA1/ECB."),
    ("ics.crypto.random", "Cryptographically Weak Randomness", "medium", "CWE-330", "crypto",
     r"Math\.random\s*\(|random\.random\s*\(|rand\(\)",
     "Use a CSPRNG (secrets.token_urlsafe / crypto.randomBytes) for tokens."),
    ("ics.debug.enabled", "Debug Mode Enabled", "medium", "CWE-489", "config",
     r"DEBUG\s*=\s*True|app\.debug\s*=\s*True|flask\.debug|setDebug\s*\(\s*true",
     "Disable debug in production; it can leak stack traces and allow RCE."),
    ("ics.cors.wildcard", "CORS Wildcard Allow-Origin", "medium", "CWE-942", "config",
     r"Access-Control-Allow-Origin:\s*\*|allow_origins\s*=\s*\[?\*|corseveryone",
     "Restrict CORS to known origins; never use '*' with credentials."),
    ("ics.auth.no_rate_limit", "No Rate Limiting Detected", "low", "CWE-770", "config",
     r"(?:/login|/auth|/api/).*(?!rateLimit|throttle|slowDown)",
     "Add rate limiting / throttling on auth and public endpoints."),
    ("ics.logging.secret", "Sensitive Data in Logs", "medium", "CWE-532", "config",
     r"logger\.(?:info|debug|error)\s*\([^)]*(?:password|token|secret|api_key|cookie)",
     "Redact secrets before logging; use structured, masked fields."),
]

ALL_RULES = SECRET_RULES + INJECTION_RULES + CONFIG_RULES
SEVERITY_WEIGHT = {"critical": 0.9, "high": 0.6, "medium": 0.3, "low": 0.1, "info": 0.05}


def _scan_code(code: str) -> list[dict]:
    findings: list[dict] = []
    lines = code.splitlines()
    for rule_id, title, severity, cwe, category, pattern, remediation in ALL_RULES:
        try:
            rx = re.compile(pattern, re.IGNORECASE)
        except re.error:
            continue
        for idx, line in enumerate(lines, start=1):
            if rx.search(line):
                # FP guard: %s/? placeholders WITH a separate params argument
                # (DB-API style) are proper parameterization, not formatting bugs.
                if rule_id == "ics.sql.format" and re.search(r"%s|%\(", line):
                    if re.search(r",\s*[\(\[\{]", line) and not re.search(r"\+|\.format\(|f['\"]", line):
                        continue
                findings.append({
                    "id": rule_id,
                    "title": title,
                    "severity": severity,
                    "cwe": cwe,
                    "category": category,
                    "line": idx,
                    "snippet": line.strip()[:160],
                    "remediation": remediation,
                })
    # de-duplicate by (id, line)
    seen = set()
    unique = []
    for f in findings:
        k = (f["id"], f["line"])
        if k not in seen:
            seen.add(k)
            unique.append(f)
    return unique


def _is_safe_url(target: str) -> tuple[bool, str]:
    """SSRF guard: only allow public http/https URLs whose resolved IPs are not internal."""
    try:
        parsed = urlparse(target)
    except Exception:
        return False, "invalid URL"
    if parsed.scheme not in ("http", "https"):
        return False, f"unsupported scheme '{parsed.scheme or 'none'}'"
    host = parsed.hostname
    if not host:
        return False, "missing host"
    try:
        infos = socket.getaddrinfo(host, None)
    except Exception:
        return False, "unresolvable host"
    for info in infos:
        ip = info[4][0].split("%")[0]
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            continue
        if (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_reserved
            or addr.is_multicast
        ):
            return False, f"blocked address {ip}"
    return True, ""


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Refuse to follow redirects so an SSRF guard can't be bypassed via a
    redirect to an internal/metadata address."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


MAX_PAGE_BYTES = 300_000


def _scan_page_html(html: str, base_url: str) -> list[dict]:
    """Review the HTML and inline scripts of a public page.

    Only inline scripts are fed to the code rules. Running them over the whole
    document would flag ordinary markup and third-party bundles, which turns a
    useful report into noise.
    """
    findings: list[dict] = []
    lines = html.splitlines()

    for match in re.finditer(r"<script\b(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.I | re.S):
        script = match.group(1)
        tag = match.group(0).split(">", 1)[0]
        kind = re.search(r"""type\s*=\s*["']([^"']+)""", tag, re.I)
        if kind and kind.group(1).lower() not in (
            "module", "text/javascript", "application/javascript",
        ):
            # JSON-LD and data blocks are documents, not executable code.
            continue
        if not script.strip() or "self.__next_f" in script or len(script) > 50_000:
            continue
        start_line = html.count("\n", 0, match.start()) + 1
        for item in _scan_code(script):
            findings.append(
                {
                    **item,
                    "title": f"Inline script: {item['title']}",
                    "line": start_line + max(0, int(item.get("line", 1)) - 1),
                    "snippet": item.get("snippet", "")[:160],
                }
            )

    # Secrets can sit in markup attributes, comments or config blobs, not only
    # inside a script tag.
    for rule_id, title, severity, cwe, category, pattern, remediation in SECRET_RULES:
        try:
            rx = re.compile(pattern, re.IGNORECASE)
        except re.error:
            continue
        for idx, line in enumerate(lines, start=1):
            if rx.search(line):
                findings.append(
                    {
                        "id": rule_id,
                        "title": f"Page source: {title}",
                        "severity": severity,
                        "cwe": cwe,
                        "category": category,
                        "line": idx,
                        "snippet": line.strip()[:160],
                        "remediation": remediation,
                    }
                )

    if base_url.startswith("https://"):
        for idx, line in enumerate(lines, start=1):
            if re.search(r"""(?:src|href|action)\s*=\s*["']http://""", line, re.I):
                findings.append(
                    {
                        "id": "ics.page.mixed_content",
                        "title": "Mixed Content on an HTTPS Page",
                        "severity": "high",
                        "cwe": "CWE-319",
                        "category": "transport",
                        "line": idx,
                        "snippet": line.strip()[:160],
                        "remediation": "Load every script, stylesheet and form target over HTTPS.",
                    }
                )

    for match in re.finditer(r"""<script\b[^>]*\bsrc\s*=\s*["'](https?://[^"']+)""", html, re.I):
        tag = match.group(0)
        if "integrity=" not in tag.lower():
            findings.append(
                {
                    "id": "ics.page.sri_missing",
                    "title": "External Script Without Subresource Integrity",
                    "severity": "low",
                    "cwe": "CWE-353",
                    "category": "supply_chain",
                    "line": html.count("\n", 0, match.start()) + 1,
                    "snippet": tag[:160],
                    "remediation": "Pin a version and add an integrity hash so a changed host cannot alter the script.",
                }
            )
            break

    # One finding per rule and line is enough for a page review.
    seen: set[tuple[str, int]] = set()
    unique: list[dict] = []
    for finding in findings:
        key = (finding["id"], int(finding.get("line", 0)))
        if key in seen:
            continue
        seen.add(key)
        unique.append(finding)
    return unique


def _scan_url(url: str) -> list[dict]:
    findings: list[dict] = []
    ok, why = _is_safe_url(url)
    if not ok:
        findings.append({
            "id": "ics.url.blocked", "title": "Outbound URL Blocked (SSRF Guard)",
            "severity": "info", "cwe": "CWE-918", "category": "transport", "line": 0,
            "snippet": url, "remediation": f"Intellirity refused to fetch this URL ({why}). Only public http/https targets are allowed.",
        })
        return findings
    if not url.startswith("https://"):
        findings.append({
            "id": "ics.url.http", "title": "Insecure Transport (HTTP)", "severity": "high",
            "cwe": "CWE-319", "category": "transport", "line": 0,
            "snippet": url, "remediation": "Serve over HTTPS and enable HSTS.",
        })
    if re.search(r"[?&](?:redirect|return|next|url|goto|dest|continue|redir)\s*=", url, re.I):
        findings.append({
            "id": "ics.url.open_redirect", "title": "Open Redirect Parameter", "severity": "medium",
            "cwe": "CWE-601", "category": "transport", "line": 0,
            "snippet": url, "remediation": "Validate redirect targets against an allowlist.",
        })
    # Probe live headers and page source (best-effort, short timeout). Redirects
    # are NOT followed: an internal redirect would bypass the SSRF guard.
    try:
        opener = urllib.request.build_opener(_NoRedirect())
        req = urllib.request.Request(
            url,
            method="GET",
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; Intellirity-Security/1.0; +https://www.intellirity.com)",
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
            },
        )
        with opener.open(req, timeout=8) as resp:
            headers = {k.lower(): v for k, v in resp.getheaders()}
            content_type = headers.get("content-type", "")
            body = b""
            if "text/html" in content_type or "javascript" in content_type:
                body = resp.read(MAX_PAGE_BYTES)
        for header, label, sev in [
            ("strict-transport-security", "HSTS", "medium"),
            ("content-security-policy", "Content-Security-Policy", "medium"),
            ("x-frame-options", "X-Frame-Options", "low"),
            ("x-content-type-options", "X-Content-Type-Options", "low"),
        ]:
            if header not in headers:
                findings.append({
                    "id": f"ics.header.{header}", "title": f"Missing {label} Header",
                    "severity": sev, "cwe": "CWE-693", "category": "headers", "line": 0,
                    "snippet": header, "remediation": f"Add the {label} response header.",
                })

        if "x-powered-by" in headers:
            findings.append({
                "id": "ics.header.x_powered_by", "title": "Server Technology Disclosure",
                "severity": "low", "cwe": "CWE-200", "category": "headers", "line": 0,
                "snippet": f"X-Powered-By: {headers['x-powered-by'][:80]}",
                "remediation": "Remove X-Powered-By so the stack is not advertised.",
            })

        csp = headers.get("content-security-policy", "")
        script_src = next(
            (part.strip() for part in csp.split(";") if part.strip().lower().startswith("script-src")),
            "",
        )
        if ("unsafe-inline" in script_src or "unsafe-eval" in script_src) and "nonce-" not in script_src:
            findings.append({
                "id": "ics.header.csp_weak", "title": "Content-Security-Policy Allows Unsafe Scripts",
                "severity": "low", "cwe": "CWE-693", "category": "headers", "line": 0,
                "snippet": script_src[:160],
                "remediation": "Remove unsafe-inline/unsafe-eval from script-src and use nonces or hashes.",
            })

        if (
            headers.get("access-control-allow-origin", "").strip() == "*"
            and headers.get("access-control-allow-credentials", "").strip().lower() == "true"
        ):
            findings.append({
                "id": "ics.header.cors_wildcard", "title": "CORS Allows Every Origin",
                "severity": "medium", "cwe": "CWE-942", "category": "headers", "line": 0,
                "snippet": "Access-Control-Allow-Origin: *",
                "remediation": "Restrict CORS to the origins that need the response.",
            })

        for cookie in headers.get("set-cookie", "").split("\n"):
            cookie = cookie.strip()
            if not cookie:
                continue
            lowered = cookie.lower()
            missing = [flag for flag in ("secure", "httponly", "samesite") if flag not in lowered]
            if missing:
                findings.append({
                    "id": "ics.cookie.flags", "title": "Cookie Missing Security Flags",
                    "severity": "medium", "cwe": "CWE-614", "category": "cookies", "line": 0,
                    "snippet": cookie.split(";")[0][:120],
                    "remediation": f"Set {', '.join(missing)} on cookies that carry a session.",
                })
                break

        if body:
            html = body.decode(resp.headers.get_content_charset() or "utf-8", "replace")
            findings.extend(_scan_page_html(html, url))
    except urllib.error.HTTPError as exc:
        if 300 <= exc.code < 400:
            location = exc.headers.get("location", "") if exc.headers else ""
            findings.append({
                "id": "ics.url.redirect", "title": "Target Redirects Before Serving the Page",
                "severity": "info", "cwe": "N/A", "category": "transport", "line": 0,
                "snippet": f"{exc.code} -> {location[:160]}",
                "remediation": "Scan the final URL (usually the www or https version) so the page source itself is reviewed.",
            })
        else:
            findings.append({
                "id": "ics.url.unreachable", "title": f"Target Returned HTTP {exc.code}",
                "severity": "info", "cwe": "N/A", "category": "transport", "line": 0,
                "snippet": url, "remediation": "Only public pages that return 200 can be reviewed.",
            })
    except Exception:
        findings.append({
            "id": "ics.url.unreachable", "title": "Target Not Reachable for Live Probe",
            "severity": "info", "cwe": "N/A", "category": "transport", "line": 0,
            "snippet": url, "remediation": "Intellirity analyzed the URL statically; live checks require a reachable host.",
        })
    return findings


def run_code_scan(target_type: str = "code", target: str = "", code: str = "") -> dict[str, Any]:
    findings: list[dict] = []
    if target_type in ("code", "github", "file") and code:
        findings.extend(_scan_code(code))
    elif target_type == "url" or target:
        findings.extend(_scan_url(target or code))

    risk = 0.0
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        sev = f.get("severity", "low")
        risk += SEVERITY_WEIGHT.get(sev, 0.1)
        counts[sev] = counts.get(sev, 0) + 1
    risk = round(min(risk, 1.0), 3)

    if risk >= 0.7:
        band = "critical"
    elif risk >= 0.4:
        band = "high"
    elif risk >= 0.15:
        band = "medium"
    elif risk > 0:
        band = "low"
    else:
        band = "none"

    summary = (
        f"{counts['critical']} critical, {counts['high']} high, "
        f"{counts['medium']} medium, {counts['low']} low"
    )
    recommendation = (
        "No issues detected by static analysis."
        if not findings else
        "Prioritize critical and high findings. Rotate any exposed secrets immediately, "
        "parameterize all queries, sanitize untrusted output, and enforce HTTPS + security headers."
    )

    return {
        "engine": "vibe-code-security",
        "target_type": target_type,
        "target": target or ("<code snippet>" if code else ""),
        "findings": findings,
        "findings_count": len(findings),
        "risk_score": risk,
        "severity": band,
        "counts": counts,
        "summary": summary,
        "recommendation": recommendation,
    }
