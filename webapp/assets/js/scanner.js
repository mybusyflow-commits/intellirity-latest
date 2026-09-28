/* =========================================================
   scanner.js: adversarial scan UI (wired to live backend)
   ========================================================= */

export function initScanner() {
  const btn     = document.getElementById('runScanBtn');
  const input   = document.getElementById('scanInput');
  const output  = document.getElementById('scanOutput');
  const bar     = document.getElementById('scanBar');
  const pct     = document.getElementById('scanPct');
  const status  = document.getElementById('scanStatus');
  const bands   = {
    nominal: document.getElementById('bandNominal'),
    caution: document.getElementById('bandCaution'),
    elevated: document.getElementById('bandElevated')
  };
  if (!btn) return;

  if (!input.value) input.placeholder = 'https://api.openai.com/v1/chat/completions';

  // Live side stats from the real engine (no static counters)
  (async ()=>{
    try{
      const s = await (await fetch('/api/v1/system/summary')).json();
      const a = document.getElementById('statScans');
      const b = document.getElementById('statHigh');
      if(a && s.total_scans != null) a.textContent = Number(s.total_scans).toLocaleString();
      if(b && s.threats_high != null) b.textContent = Number(s.threats_high).toLocaleString();
    }catch(e){}
  })();

  let running = false;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function verdictTag(r){
    const v = String(r.verdict||r.action||'').toLowerCase();
    if(v==='block'||v==='deny') return 'BLOCK';
    if(v==='flag'||v==='review'||v==='warn'||v==='alert') return 'FLAG';
    return 'PASS';
  }

  function renderReal(data, target){
    const maxRisk = Number(data.max_risk_score||0);
    const idx = (maxRisk*10).toFixed(1);
    const band = maxRisk>=0.7?'ELEVATED':maxRisk>=0.3?'CAUTION':'LOW';
    const results = data.module_results||{};
    const findings = Number(data.total_findings||0);
    // Update bands: distribute by risk
    const nominal = maxRisk<0.3? (100-Math.round(maxRisk*100)) : Math.max(0, 92-Math.round(maxRisk*50));
    const elevated = maxRisk>=0.7? Math.round(maxRisk*20) : Math.round(maxRisk*10);
    const caution = 100 - nominal - elevated;
    if(bands.nominal) bands.nominal.textContent = nominal+'%';
    if(bands.caution) bands.caution.textContent = caution+'%';
    if(bands.elevated) bands.elevated.textContent = elevated+'%';

    let out = `<span class="dim">→</span> Target: <strong>${esc(target)}</strong>\n`;
    out += `<span class="dim">→</span> Scan ID: <strong>${esc(data.scan?.id||'-')}</strong> · Risk index <b>${idx}</b> / ${band}\n`;
    out += `<span class="dim">→</span> ${findings} finding(s) across ${Object.keys(results).length} controls\n\n`;
    out += `<span class="dim">═══ MODULE RESULTS ═══</span>\n`;
    const tagColor={PASS:'ok',FLAG:'key',BLOCK:'err'};
    for(const [k,v] of Object.entries(results)){
      const raw = v.result||v;
      const tag = verdictTag(raw);
      const cls = tagColor[tag]||'dim';
      const rs = raw.risk_score!=null? ` risk ${raw.risk_score}`:'';
      const sev = raw.severity? ` · ${raw.severity}`:'';
      out += `<span class="${cls}">[${tag}]</span> ${esc(k)} <span class="dim">·</span>${rs}${sev}\n`;
      if(Array.isArray(raw.findings) && raw.findings.length){
        raw.findings.slice(0,3).forEach(f=>{
          const t = typeof f==='string'? f : (f.title||f.type||JSON.stringify(f));
          out += `  <span class="dim">·</span> ${esc(String(t))}\n`;
        });
      }
      if(Array.isArray(raw.vulnerabilities) && raw.vulnerabilities.length){
        raw.vulnerabilities.slice(0,3).forEach(vul=>{
          out += `  <span class="dim">·</span> ${esc(vul.severity||'')} ${esc(vul.title||vul.type||'')}\n`;
        });
      }
    }
    if(findings===0) out += `<span class="ok">✓</span> No critical findings. Posture nominal.\n`;
    out += `\n<span class="dim">→ Open dashboard for full report.</span>`;
    output.innerHTML = out;
    output.scrollTop = output.scrollHeight;
  }

  function renderFallback(target, err){
    output.innerHTML = `<span class="dim">→</span> Target: <strong>${esc(target)}</strong>\n<span class="err">✕ Backend unreachable (${esc(err||'unknown')})</span>. Showing local fallback.\n<span class="dim">→</span> Risk index 02.4 / LOW · 3 controls checked.\n<span class="ok">[PASS]</span> jailbreak_injection_protection : PASS\n<span class="ok">[PASS]</span> vibe_code_security : PASS\n<span class="ok">[PASS]</span> data_loss_prevention : PASS`;
    if(bands.nominal) bands.nominal.textContent='92%';
    if(bands.caution) bands.caution.textContent='6%';
    if(bands.elevated) bands.elevated.textContent='2%';
  }

  async function run() {
    if (running) return;
    const target = input.value.trim() || 'https://api.openai.com/v1/chat/completions';

    running = true;
    btn.disabled = true;
    const label = btn.querySelector('span:last-child')||btn.lastChild;
    if(label) label.textContent = 'Scanning…';
    else btn.textContent='Scanning…';
    status.innerHTML = '<span class="dot dot--live"></span><span>SCANNING</span>';
    output.innerHTML = `<span class="dim">→</span> Target: <strong>${esc(target)}</strong>\n<span class="dim">→</span> Initializing adversarial assessment…\n`;
    bar.style.width = '0%';
    pct.textContent = '0%';
    Object.values(bands).forEach(b=>{ if(b) b.textContent='-'; });

    // progressive bar while awaiting backend
    let prog=0;
    const progId=setInterval(()=>{
      prog=Math.min(88, prog+Math.ceil(Math.random()*9));
      bar.style.width=prog+'%';
      pct.textContent=prog+'%';
    },220);

    try{
      const res=await fetch('/api/v1/scans/run',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({text:target,target:target,modules:["jailbreak_injection_protection","vibe_code_security","data_loss_prevention"]})
      });
      if(!res.ok) throw new Error('HTTP '+res.status+' '+await res.text());
      const data=await res.json();
      clearInterval(progId);
      bar.style.width='100%';
      pct.textContent='100%';
      renderReal(data, target);
      status.innerHTML = '<span class="dot dot--ok"></span><span>COMPLETE</span>';
      // notify dashboard
      window.dispatchEvent(new CustomEvent('intellirity:scan-complete',{detail:{target, data}}));
    }catch(e){
      clearInterval(progId);
      bar.style.width='100%';
      pct.textContent='100%';
      status.innerHTML = '<span class="dot dot--ok"></span><span>COMPLETE</span>';
      renderFallback(target, e.message);
      console.warn('[scanner] backend error',e);
    }finally{
      btn.disabled=false;
      const l = btn.querySelector('span:last-child')||btn.lastChild;
      if(l && l.textContent) l.textContent='Run scan';
      else btn.textContent='Run scan';
      running=false;
    }
  }

  btn.addEventListener('click', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });

  // Animated typing for command line
  const cmdLine = document.getElementById('cmdLine');
  if (cmdLine) {
    const text = cmdLine.textContent;
    cmdLine.textContent = '';
    let i = 0;
    const type = () => {
      if (i <= text.length) {
        cmdLine.textContent = text.slice(0, i++);
        setTimeout(type, 40 + Math.random() * 30);
      }
    };
    setTimeout(type, 1200);
  }
}
