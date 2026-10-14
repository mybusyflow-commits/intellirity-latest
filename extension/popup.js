/* Intellirity Prompt Shield popup. Screens pasted prompts against the
   live engine (jailbreak + DLP + moderation) and shows real verdicts. */
const $ = (id) => document.getElementById(id);

async function base() {
  const custom = ($("base").value || "").trim().replace(/\/$/, "");
  if (custom) {
    chrome.storage.local.set({ base: custom });
    return custom;
  }
  const saved = await chrome.storage.local.get("base");
  return (saved.base || "http://localhost:8000").replace(/\/$/, "");
}

$("go").addEventListener("click", async () => {
  const text = ($("t").value || "").trim();
  const out = $("out");
  if (!text) {
    out.innerHTML = '<span class="warn">paste a prompt first</span>';
    return;
  }
  out.innerHTML = '<span class="dim">screening…</span>';
  $("go").disabled = true;
  try {
    const b = await base();
    const mods = [
      ["jailbreak_injection_protection", { text, direction: "input" }],
      ["data_loss_prevention", { text, direction: "input" }],
      ["content_moderation", { text, direction: "input" }],
    ];
    const lines = [];
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
      const cls = v === "allow" || v === "log" || v === "monitor" ? "ok" : v === "block" || v === "deny" ? "bad" : "warn";
      const n = (res.findings || []).length;
      lines.push(`<span class="${cls}">[${v.toUpperCase()} ${risk}]</span> ${key} · ${n} finding(s)`);
    }
    out.innerHTML = lines.join("\n");
  } catch (e) {
    out.innerHTML = `<span class="bad">engine unreachable.</span><span class="dim"> Is it running at the URL above? ${String(e).slice(0, 80)}</span>`;
  } finally {
    $("go").disabled = false;
  }
});
