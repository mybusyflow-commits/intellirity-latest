"""Website-source review: inline scripts, page secrets and transport checks."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.code_analyzer import _scan_page_html  # noqa: E402


def test_inline_script_is_reviewed_at_the_page_line():
    html = """<!doctype html>
<html><body>
<div>hello</div>
<script>
  const q = "SELECT * FROM users WHERE id=" + req.query.id;
  document.body.innerHTML = req.query.name;
</script>
</body></html>"""
    findings = _scan_page_html(html, "https://example.com")
    titles = {f["title"] for f in findings}
    assert "Inline script: SQL Built via String Concatenation" in titles
    assert "Inline script: Unsanitized HTML Injection (XSS)" in titles
    assert all(f["line"] >= 4 for f in findings)


def test_json_ld_is_not_treated_as_executable_code():
    html = """<script type="application/ld+json">
{"@context":"https://schema.org","url":"https://www.example.com","logo":{"@type":"ImageObject"}}
</script>
<script>self.__next_f.push([1, "innerHTML"])</script>"""
    assert _scan_page_html(html, "https://example.com") == []


def test_mixed_content_http_assets_on_an_https_page_are_flagged():
    html = '<img src="http://cdn.example.com/a.png" />'
    findings = _scan_page_html(html, "https://example.com")
    assert any(f["id"] == "ics.page.mixed_content" for f in findings)


def test_external_script_without_integrity_is_flagged():
    html = '<script src="https://cdn.example.com/widget.js"></script>'
    findings = _scan_page_html(html, "https://example.com")
    assert any(f["id"] == "ics.page.sri_missing" for f in findings)
