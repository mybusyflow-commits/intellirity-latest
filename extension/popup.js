/* Intellirity Prompt Shield popup. Screens pasted prompts against the
   live engine (jailbreak + DLP + moderation) and shows real verdicts.

   All output is written with textContent or through created elements —
   never innerHTML with engine-supplied text. */
const $ = (id) => document.getElementById(id);

async function base() {
  const custom = ($("base").value || "").trim().replace(/\/$/, "");
  if (custom) {
    chrome.storage.local.set({ base: custom });
    await ensureHostAllowed(custom);
    return custom;
  }
  const saved = await chrome.storage.local.get("base");
  return (saved.base || "http://localhost:8000").replace(/\/$/, "");
}

/* The manifest only grants localhost by default. A deployed engine needs an
   optional host permission, which Chrome grants only when the user asks for
   it — so we ask, at the moment they point the extension at that host. */
async function ensureHostAllowed(url) {
  let origin;
  try {
    origin = new URL(url).origin + "/*";
  } catch {
    return;
  }
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
    return;
  }
  try {
    const has = await chrome.permissions.contains({ origins: [origin] });
    if (has) return;
    const granted = await chrome.permissions.request({ origins: [origin] });
    if (!granted) {
      line($("out"), "warn", `permission to reach ${origin} was declined`);
    }
  } catch {
    /* permissions API unavailable (older Chrome): the fetch will fail loudly */
  }
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function line(node, cls, text) {
  const span = document.createElement("span");
  span.className = cls;
  span.textContent = text;
  node.appendChild(span);
  return span;
}

$("go").addEventListener("click", async () => {
  const text = ($("t").value || "").trim();
  const out = $("out");
  clear(out);
  if (!text) {
    line(out, "warn", "paste a prompt first");
    return;
  }
  line(out, "dim", "screening…");
  $("go").disabled = true;
  try {
    const b = await base();
    const mods = [
      ["jailbreak_injection_protection", { text, direction: "input" }],
      ["data_loss_prevention", { text, direction: "input" }],
      ["content_moderation", { text, direction: "input" }],
    ];
    const results = [];
    for (const [key, payload] of mods) {
      const r = await fetch(`${b}/api/v1/modules/${key}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`${key}: HTTP ${r.status}`);
      const j = await r.json();
      const res = j.result || {};
      const v = String(res.verdict || res.action || "allow").toLowerCase();
      const risk = Math.round((res.risk_score || 0) * 100);
      const cls =
        v === "allow" || v === "log" || v === "monitor"
          ? "ok"
          : v === "block" || v === "deny"
            ? "bad"
            : "warn";
      const n = (res.findings || []).length;
      results.push({ cls, v, risk, key, n });
    }
    clear(out);
    for (const r of results) {
      line(out, r.cls, `[${r.v.toUpperCase()} ${r.risk}]`);
      out.appendChild(document.createTextNode(` ${r.key} · ${r.n} finding(s)`));
      out.appendChild(document.createTextNode("\n"));
    }
  } catch (e) {
    clear(out);
    line(out, "bad", "engine unreachable. ");
    line(out, "dim", `Is it running at the URL above? ${String(e).slice(0, 80)}`);
  } finally {
    $("go").disabled = false;
  }
});
