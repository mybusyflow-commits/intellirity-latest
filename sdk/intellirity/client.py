"""Intellirity AI security SDK client."""

import requests

DEFAULT_BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"
TIMEOUT_SECONDS = 10


class Shield:
    """Client for the Intellirity API."""

    def __init__(self, api_key=None, base_url="http://localhost:8000"):
        self.api_key = api_key
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")

    def _headers(self):
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    def _post(self, path, payload):
        url = self.base_url + path
        try:
            resp = requests.post(
                url, json=payload, headers=self._headers(), timeout=TIMEOUT_SECONDS
            )
        except requests.RequestException as exc:
            raise RuntimeError("request failed: %s" % exc)
        if resp.status_code == 403:
            raise PermissionError(
                "403 Forbidden: plan lacks this feature, upgrade required."
            )
        if resp.status_code >= 400:
            raise RuntimeError(
                "request failed with status %s: %s" % (resp.status_code, resp.text)
            )
        return resp.json()

    def check_jailbreak(self, text):
        """Scan text with the jailbreak protection module."""
        payload = {"text": text, "direction": "input"}
        return self._post(
            API_PREFIX + "/modules/jailbreak_injection_protection/scan", payload
        )

    def check_vibe(self, target, code=""):
        """Scan code with the vibe code security module."""
        payload = {"target": target, "code": code}
        return self._post(API_PREFIX + "/modules/vibe_code_security/scan", payload)

    def check_dlp(self, text, direction="input"):
        """Scan text with the data loss prevention module."""
        payload = {"text": text, "direction": direction}
        return self._post(API_PREFIX + "/modules/data_loss_prevention/scan", payload)

    def scan(self, text, modules=None):
        """Run a multi module scan."""
        if modules is None:
            modules = [
                "jailbreak_injection_protection",
                "vibe_code_security",
                "data_loss_prevention",
            ]
        payload = {"text": text, "target": text, "modules": modules}
        return self._post(API_PREFIX + "/scans/run", payload)

    def create_organization(self, name, slug):
        """Create a new organization."""
        payload = {"name": name, "slug": slug}
        return self._post(API_PREFIX + "/organizations/", payload)
