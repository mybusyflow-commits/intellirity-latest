"""Repository review for the Vibe-Code Security module.

The module already reviews a single snippet. A real review also needs the
shape of the whole repository: which files were looked at, where each finding
sits, what the code's attack surface looks like, and a report a reviewer can
hand to someone else.

This module adds that layer. It is deliberately deterministic and offline:
nothing from the submitted files is executed, fetched or persisted outside
the response. The autonomous, exploit-proving half of a review needs a
container sandbox and an LLM budget, and is not part of a request-scoped
serverless function.

Outputs:
  * findings   - per file, with line, CWE, severity, confidence, fix effort
  * threat model - entry points, trust boundaries and STRIDE questions
  * coverage   - what was read, what was skipped and why
  * report     - severity summary, top risks and an ordered remediation plan
  * SARIF 2.1.0 - the interchange format CI systems already ingest
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

from app.services.code_analyzer import ALL_RULES

MAX_FILES = 300
MAX_FILE_CHARS = 200_000
MAX_TOTAL_CHARS = 1_500_000

SEVERITY_WEIGHT = {"critical": 0.9, "high": 0.6, "medium": 0.3, "low": 0.1, "info": 0.05}

LANG_BY_EXT = {
    ".py": "python",
    ".pyi": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".rb": "ruby",
    ".php": "php",
    ".java": "java",
    ".kt": "kotlin",
    ".cs": "csharp",
    ".rs": "rust",
    ".sql": "sql",
    ".sh": "shell",
    ".bash": "shell",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".json": "json",
    ".tf": "terraform",
    ".env": "dotenv",
}

# Binaries and assets cannot be reviewed as text; listing them keeps the
# coverage honest instead of silently pretending they were scanned.
SKIP_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg", ".pdf",
    ".zip", ".gz", ".tar", ".tgz", ".rar", ".7z", ".exe", ".dll", ".so",
    ".dylib", ".class", ".jar", ".woff", ".woff2", ".ttf", ".eot",
    ".mp3", ".mp4", ".mov", ".wav", ".avif", ".wasm", ".map",
}

# Packages with a public, well-known security or maintenance problem. The
# version is reported as written; this is a review prompt, not a CVE match.
RISKY_PACKAGES = {
    "vm2": ("critical", "CWE-693", "vm2 has repeated sandbox escapes; untrusted code can reach the host. The project is discontinued."),
    "node-serialize": ("critical", "CWE-502", "node-serialize deserializes functions; untrusted input leads to remote code execution."),
    "event-stream": ("critical", "CWE-506", "event-stream was compromised to ship a wallet stealer in a dependency."),
    "serialize-javascript": ("high", "CWE-1321", "serialize-javascript has prototype-pollution issues in older ranges."),
    "pycrypto": ("high", "CWE-1104", "PyCrypto is unmaintained and has known defects; use pycryptodome or cryptography."),
    "request": ("medium", "CWE-1104", "request is deprecated and receives no security fixes."),
    "node-sass": ("medium", "CWE-1104", "node-sass is unmaintained; use the sass package."),
    "moment": ("low", "CWE-1104", "moment is in maintenance mode; migration is recommended."),
    "left-pad": ("low", "CWE-1104", "left-pad is abandoned and no longer maintained."),
}

DEPENDENCY_FILES = re.compile(
    r"(^|/)(package\.json|requirements[\w.-]*\.txt|Pipfile|pyproject\.toml|go\.mod|Gemfile)$"
)

ROUTE_PATTERNS = [
    re.compile(r"""\b(?:app|router|server)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]"""),
    re.compile(r"""@(?:app|router|bp|blueprint)\.(get|post|put|patch|delete|route)\s*\(\s*['"]([^'"]+)['"]"""),
    re.compile(r"""@(?:Get|Post|Put|Patch|Delete)Mapping\s*\(\s*(?:value\s*=\s*)?['"]([^'"]+)['"]"""),
    re.compile(r"""\bpath\s*\(\s*['"]([^'"]+)['"]\s*,"""),
]

AUTH_SIGNALS = re.compile(
    r"\b(?:require_user|requireUser|requireAuth|isAuthenticated|login_required|jwt\.verify|verifyClerk|passport|authMiddleware|Authorization|session\[)",
    re.IGNORECASE,
)
UPLOAD_SIGNALS = re.compile(
    r"\b(?:multer|UploadFile|FileField|multipart/form-data|busboy|formidable|req\.files)\b",
    re.IGNORECASE,
)
OUTBOUND_SIGNALS = re.compile(
    r"\b(?:requests\.(?:get|post)|httpx\.|axios\.|fetch\s*\(|urlopen\s*\(|http\.request|got\s*\()",
    re.IGNORECASE,
)
SHELL_SIGNALS = re.compile(
    r"\b(?:child_process\.(?:exec|spawn)|os\.system|os\.popen|subprocess\.|execSync|spawnSync)\b",
)
DATASTORE_SIGNALS = re.compile(
    r"\b(?:SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|prisma\.|mongoose\.|sequelize\.|knex\(|sqlalchemy|session\.query)\b",
    re.IGNORECASE,
)
SECRET_SIGNALS = re.compile(
    r"\b(?:api[_-]?key|secret|password|token|private[_-]?key)\b\s*[:=]\s*['\"][^'\"]{6,}['\"]",
    re.IGNORECASE,
)


def _language(path: str) -> str:
    lowered = path.lower()
    for ext, lang in LANG_BY_EXT.items():
        if lowered.endswith(ext):
            return lang
    name = lowered.rsplit("/", 1)[-1]
    if name in ("dockerfile", "makefile"):
        return "shell" if name == "makefile" else "dockerfile"
    return "text"


def _ext(path: str) -> str:
    lowered = path.lower()
    if "." not in lowered.rsplit("/", 1)[-1]:
        return ""
    return "." + lowered.rsplit(".", 1)[-1]


def normalize_files(raw: Any) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """Accept [{path, content}] or [{name, content}] and bound the payload.

    Returns the files to scan and a list of skipped entries with a reason, so
    the report can say what was not reviewed instead of implying full cover.
    """
    files: list[dict[str, str]] = []
    skipped: list[dict[str, str]] = []
    if not isinstance(raw, list):
        return files, [{"path": "<payload>", "reason": "files must be a list"}]

    total = 0
    seen: set[str] = set()
    for item in raw[: MAX_FILES * 2]:
        if not isinstance(item, dict):
            skipped.append({"path": "<entry>", "reason": "entry is not an object"})
            continue
        path = str(item.get("path") or item.get("name") or "").strip().replace("\\", "/")
        content = item.get("content")
        if content is None:
            content = item.get("text")
        if not path:
            skipped.append({"path": "<entry>", "reason": "missing path"})
            continue
        if path.startswith("/") or ".." in path.split("/"):
            skipped.append({"path": path, "reason": "path must be relative and stay inside the repository"})
            continue
        if not isinstance(content, str):
            skipped.append({"path": path, "reason": "content is not text"})
            continue
        if _ext(path) in SKIP_EXT:
            skipped.append({"path": path, "reason": "binary or asset file"})
            continue
        if len(content) > MAX_FILE_CHARS:
            skipped.append({"path": path, "reason": f"larger than {MAX_FILE_CHARS:,} characters"})
            continue
        if total + len(content) > MAX_TOTAL_CHARS:
            skipped.append({"path": path, "reason": "repository budget exhausted"})
            continue
        key = path.lower()
        if key in seen:
            skipped.append({"path": path, "reason": "duplicate path"})
            continue
        if len(files) >= MAX_FILES:
            skipped.append({"path": path, "reason": f"more than {MAX_FILES} files"})
            continue
        seen.add(key)
        total += len(content)
        files.append({"path": path, "content": content})
    return files, skipped


def _scan_file(path: str, content: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    lines = content.splitlines()
    for rule_id, title, severity, cwe, category, pattern, remediation in ALL_RULES:
        try:
            rx = re.compile(pattern, re.IGNORECASE)
        except re.error:
            continue
        for idx, line in enumerate(lines, start=1):
            if not rx.search(line):
                continue
            # DB-API placeholders with a separate params argument are the
            # parameterized form, not a formatting bug.
            if rule_id == "ics.sql.format" and re.search(r"%s|%\(", line):
                if re.search(r",\s*[\(\[\{]", line) and not re.search(r"\+|\.format\(|f['\"]", line):
                    continue
            findings.append(
                {
                    "file": path,
                    "line": idx,
                    "snippet": line.strip()[:200],
                    "rule_id": rule_id,
                    "title": title,
                    "severity": severity,
                    "cwe": cwe,
                    "category": category,
                    "description": title,
                    "remediation": remediation,
                    "confidence": "high" if category == "secrets" else "medium",
                    "fix_effort": "trivial" if category == "secrets" else "low" if category == "injection" else "medium",
                }
            )
    return findings


def _audit_dependencies(path: str, content: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    name = path.rsplit("/", 1)[-1].lower()

    def add(line: int, title: str, severity: str, cwe: str, remediation: str, snippet: str, rule_id: str) -> None:
        findings.append(
            {
                "file": path,
                "line": line,
                "snippet": snippet.strip()[:200],
                "rule_id": rule_id,
                "title": title,
                "severity": severity,
                "cwe": cwe,
                "category": "supply_chain",
                "description": title,
                "remediation": remediation,
                "confidence": "high",
                "fix_effort": "low",
            }
        )

    if name == "package.json":
        for idx, line in enumerate(content.splitlines(), start=1):
            m = re.search(r'"([@\w./-]+)"\s*:\s*"([^"]*)"', line)
            if not m:
                continue
            pkg, version = m.group(1), m.group(2).strip()
            if pkg in ("name", "version", "description", "license", "type", "main", "module"):
                continue
            risky = RISKY_PACKAGES.get(pkg.lower())
            if risky:
                sev, cwe, why = risky
                add(idx, f"Risky dependency: {pkg}", sev, cwe, why, line, f"dep.risky.{pkg}")
            if version in ("*", "latest", "next") or version.startswith(">="):
                add(
                    idx,
                    f"Unpinned dependency: {pkg}",
                    "low",
                    "CWE-1104",
                    "Pin an exact version and commit the lockfile so a compromised release cannot enter a build.",
                    line,
                    "dep.unpinned",
                )
        return findings

    if name.startswith("requirements") or name in ("pipfile", "pyproject.toml", "gemfile", "go.mod"):
        for idx, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith(("#", "[", "//")):
                continue
            m = re.match(r'^"?([A-Za-z0-9_.-]+)"?\s*([<>=!~]*)\s*([^,\s#]*)', stripped)
            if not m:
                continue
            pkg, op, version = m.group(1), m.group(2), m.group(3)
            if pkg.lower() in ("python", "go", "module", "source", "require", "django", "flask"):
                # `require`/`module` are go.mod keywords, not packages.
                if pkg.lower() in ("require", "module", "go", "source"):
                    continue
            risky = RISKY_PACKAGES.get(pkg.lower())
            if risky:
                sev, cwe, why = risky
                add(idx, f"Risky dependency: {pkg}", sev, cwe, why, line, f"dep.risky.{pkg}")
            if op != "==" or not version:
                add(
                    idx,
                    f"Unpinned dependency: {pkg}",
                    "low",
                    "CWE-1104",
                    "Pin an exact version and use a lockfile or hash-pinned requirements.",
                    line,
                    "dep.unpinned",
                )
        return findings

    return findings


def _threat_model(files: list[dict[str, str]]) -> dict[str, Any]:
    routes: list[dict[str, str]] = []
    entrypoints: list[dict[str, str]] = []
    signals = {
        "authentication": [],
        "upload": [],
        "outbound": [],
        "shell": [],
        "datastore": [],
        "secrets": [],
    }

    for item in files:
        path, content = item["path"], item["content"]
        for pattern in ROUTE_PATTERNS:
            for m in pattern.finditer(content):
                method = (m.group(1) or "route").upper()
                target = m.group(2)
                routes.append({"path": path, "method": method, "route": target})
        for key, rx in (
            ("authentication", AUTH_SIGNALS),
            ("upload", UPLOAD_SIGNALS),
            ("outbound", OUTBOUND_SIGNALS),
            ("shell", SHELL_SIGNALS),
            ("datastore", DATASTORE_SIGNALS),
            ("secrets", SECRET_SIGNALS),
        ):
            if rx.search(content):
                signals[key].append(path)
        entrypoints.append({"path": path, "lines": content.count("\n") + 1})

    threats: list[dict[str, str]] = []
    if routes:
        threats.append(
            {
                "category": "Spoofing",
                "surface": f"{len(routes)} HTTP route(s)",
                "risk": "high" if "authentication" not in signals or not signals["authentication"] else "medium",
                "question": "Does every state-changing route verify identity and object ownership, not just a valid session?",
            }
        )
    if signals["datastore"]:
        threats.append(
            {
                "category": "Tampering",
                "surface": f"database access in {len(signals['datastore'])} file(s)",
                "risk": "high",
                "question": "Is every query parameterized, and are tenant filters applied server-side on read and write?",
            }
        )
    if signals["upload"]:
        threats.append(
            {
                "category": "Tampering",
                "surface": f"file upload paths in {len(signals['upload'])} file(s)",
                "risk": "high",
                "question": "Are uploads type-checked by content, stored outside the web root, and served with a fixed content type?",
            }
        )
    if signals["outbound"]:
        threats.append(
            {
                "category": "Information disclosure",
                "surface": f"outbound requests in {len(signals['outbound'])} file(s)",
                "risk": "high" if signals["datastore"] else "medium",
                "question": "Can user input choose the destination URL or headers, and is egress restricted to an allowlist?",
            }
        )
    if signals["shell"]:
        threats.append(
            {
                "category": "Elevation of privilege",
                "surface": f"process execution in {len(signals['shell'])} file(s)",
                "risk": "critical",
                "question": "Is shell execution avoided entirely, and are arguments passed as a list with an allowlist?",
            }
        )
    if signals["secrets"]:
        threats.append(
            {
                "category": "Information disclosure",
                "surface": f"literal credentials in {len(signals['secrets'])} file(s)",
                "risk": "critical",
                "question": "Which of these literals are live, and have they been rotated since they entered version control?",
            }
        )
    threats.append(
        {
            "category": "Repudiation",
            "surface": "decision and change history",
            "risk": "medium",
            "question": "Is every privileged action recorded with an actor, a timestamp and a tamper-evident hash?",
        }
    )
    threats.append(
        {
            "category": "Denial of service",
            "surface": "request and job intake",
            "risk": "medium",
            "question": "Are request size, regex cost, upload size and job concurrency bounded per caller?",
        }
    )

    return {
        "routes": routes[:200],
        "signals": {k: v[:50] for k, v in signals.items()},
        "threats": threats,
        "assumptions": [
            "Static review only: no code was executed and no network call was made.",
            "A finding is a review prompt, not proof of exploitability.",
            "Dependency versions are reported as written; lockfile resolution is not performed.",
        ],
    }


def _sarif(report: dict[str, Any]) -> dict[str, Any]:
    findings = report["findings"]
    rules: dict[str, dict[str, Any]] = {}
    for f in findings:
        rules.setdefault(
            f["rule_id"],
            {
                "id": f["rule_id"],
                "name": f["title"].replace(" ", ""),
                "shortDescription": {"text": f["title"]},
                "fullDescription": {"text": f["description"]},
                "help": {"text": f["remediation"], "markdown": f["remediation"]},
                "properties": {"cwe": f["cwe"], "category": f["category"], "security-severity": f["severity"]},
            },
        )
    rule_ids = list(rules)
    index = {rid: i for i, rid in enumerate(rule_ids)}
    level = {"critical": "error", "high": "error", "medium": "warning", "low": "note", "info": "note"}
    results = []
    for f in findings:
        results.append(
            {
                "ruleId": f["rule_id"],
                "ruleIndex": index[f["rule_id"]],
                "level": level.get(f["severity"], "note"),
                "message": {"text": f"{f['title']} at line {f['line']}. {f['remediation']}"},
                "locations": [
                    {
                        "physicalLocation": {
                            "artifactLocation": {"uri": quote(f["file"])},
                            "region": {"startLine": max(1, int(f["line"]))},
                        }
                    }
                ],
                "partialFingerprints": {
                    "intellirity/v1": f"{f['file']}:{f['line']}:{f['rule_id']}"
                },
                "properties": {"cwe": f["cwe"], "severity": f["severity"], "confidence": f["confidence"]},
            }
        )
    return {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": "Intellirity Vibe-Code Security",
                        "informationUri": "https://www.intellirity.com/engines",
                        "rules": [rules[rid] for rid in rule_ids],
                    }
                },
                "results": results,
                "properties": {
                    "target": report.get("target", ""),
                    "files_scanned": report.get("coverage", {}).get("files_scanned", 0),
                },
            }
        ],
    }


def scan_repository(files_raw: Any, target: str = "") -> dict[str, Any]:
    files, skipped = normalize_files(files_raw)
    if not files:
        reason = skipped[0]["reason"] if skipped else "no files supplied"
        raise ValueError(f"No scannable files: {reason}")

    findings: list[dict[str, Any]] = []
    per_file: list[dict[str, Any]] = []
    rules_fired: set[str] = set()

    for item in files:
        path, content = item["path"], item["content"]
        file_findings = _scan_file(path, content)
        if DEPENDENCY_FILES.search(path):
            file_findings.extend(_audit_dependencies(path, content))
        rules_fired.update(f["rule_id"] for f in file_findings)
        findings.extend(file_findings)
        per_file.append(
            {
                "path": path,
                "language": _language(path),
                "lines": content.count("\n") + 1,
                "findings": len(file_findings),
            }
        )

    # Stable order: severity first, then path, then line.
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    findings.sort(key=lambda f: (order.get(f["severity"], 9), f["file"], f["line"], f["rule_id"]))

    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1
    risk = round(min(sum(SEVERITY_WEIGHT.get(f["severity"], 0.1) for f in findings), 1.0), 3)

    if risk >= 0.7:
        band, verdict = "critical", "block"
    elif risk >= 0.4:
        band, verdict = "high", "block"
    elif risk >= 0.15:
        band, verdict = "medium", "flag"
    elif risk > 0:
        band, verdict = "low", "flag"
    else:
        band, verdict = "none", "allow"

    threats = _threat_model(files)
    languages: dict[str, int] = {}
    for item in per_file:
        languages[item["language"]] = languages.get(item["language"], 0) + 1

    # Ordered, de-duplicated plan: one line per distinct fix, worst first.
    plan: list[dict[str, str]] = []
    seen_fix: set[str] = set()
    for f in findings:
        if f["remediation"] in seen_fix:
            continue
        seen_fix.add(f["remediation"])
        plan.append({"severity": f["severity"], "fix": f["remediation"], "file": f["file"]})
        if len(plan) >= 8:
            break

    coverage = {
        "files_scanned": len(files),
        "files_skipped": skipped[:50],
        "skipped_count": len(skipped),
        "languages": languages,
        "rules_evaluated": len(ALL_RULES),
        "rules_fired": sorted(rules_fired),
        "limits": {
            "max_files": MAX_FILES,
            "max_file_chars": MAX_FILE_CHARS,
            "max_total_chars": MAX_TOTAL_CHARS,
        },
        "confidence": "high" if not skipped else "medium" if len(skipped) <= 3 else "low",
    }

    summary = (
        f"{counts['critical']} critical, {counts['high']} high, "
        f"{counts['medium']} medium, {counts['low']} low across {len(files)} file(s)"
    )
    recommendation = (
        "No issues matched the rule set. Treat this as a baseline, not a clean bill of health."
        if not findings
        else "Fix critical and high findings first, rotate any exposed credential, then re-run the review."
    )

    report: dict[str, Any] = {
        "title": "Vibe-Code Security review",
        "target": target or f"{len(files)} file(s)",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "summary": summary,
        "severity_counts": counts,
        "risk_score": risk,
        "severity": band,
        "verdict": verdict,
        "findings": findings,
        "files": per_file,
        "threat_model": threats,
        "coverage": coverage,
        "remediation_plan": plan,
        "recommendation": recommendation,
    }
    report["sarif"] = _sarif(report)
    return report


def repository_response(files_raw: Any, target: str = "") -> dict[str, Any]:
    """Shape a repository review as a module result.

    `findings` stays a list of strings for the generic console renderer,
    while `report` carries the structured form and the SARIF document.
    """
    try:
        report = scan_repository(files_raw, target=target)
    except ValueError as exc:
        return {
            "target_type": "repository",
            "target": target,
            "vulnerabilities_found": 0,
            "vulnerabilities": [],
            "findings": [],
            "risk_score": 0.0,
            "verdict": "allow",
            "severity": "none",
            "critical_count": 0,
            "high_count": 0,
            "categories_affected": [],
            "recommendation": str(exc),
            "report": None,
            "error": str(exc),
        }

    vulnerabilities = [
        {
            "category": f["category"],
            "type": f["rule_id"],
            "title": f"{f['title']} ({f['file']}:{f['line']})",
            "description": f["description"],
            "severity": f["severity"],
            "cwe": f["cwe"],
            "remediation": f["remediation"],
            "file": f["file"],
            "line": f["line"],
            "confidence": f["confidence"],
            "fix_effort": f["fix_effort"],
        }
        for f in report["findings"]
    ]
    return {
        "target_type": "repository",
        "target": report["target"],
        "vulnerabilities_found": len(vulnerabilities),
        "vulnerabilities": vulnerabilities,
        "findings": [
            f"[{f['severity']}] {f['title']} ({f['file']}:{f['line']}) - {f['remediation']}"
            for f in report["findings"]
        ],
        "risk_score": report["risk_score"],
        "verdict": report["verdict"],
        "severity": report["severity"],
        "critical_count": report["severity_counts"]["critical"],
        "high_count": report["severity_counts"]["high"],
        "categories_affected": sorted({f["category"] for f in report["findings"]}),
        "recommendation": report["recommendation"],
        "report": report,
    }


def sarif_json(report: dict[str, Any]) -> str:
    return json.dumps(report.get("sarif", {}), indent=2)
