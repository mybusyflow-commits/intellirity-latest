"""Export the detection-engine registry to JSON for the website.

The engine descriptions are the single most valuable piece of the product
for search and answer engines: they say exactly what is detected. This
script writes them to a JSON file the Next.js site imports, so the site
can never drift from the running engine.

    python scripts/export_modules.py
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

import app.services.modules  # noqa: E402,F401  (registers every engine)
from app.services.feature_registry import FEATURE_REGISTRY  # noqa: E402

OUT = os.path.join(
    ROOT, "Intellirity-Frontend", "src", "lib", "engines.generated.json"
)

# The engine's own description is the authoritative text; the site's copy
# only adds the short label.
payload = []
for key, meta in sorted(FEATURE_REGISTRY.items()):
    payload.append(
        {
            "id": key,
            "name": meta.get("name", key),
            "description": meta.get("description", ""),
            "tier": meta.get("tier", "free"),
        }
    )

with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(payload, fh, indent=2, ensure_ascii=False)
    fh.write("\n")

print(f"wrote {len(payload)} engines to {OUT}")
