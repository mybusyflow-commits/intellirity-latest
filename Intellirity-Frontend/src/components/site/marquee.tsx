const CAPABILITIES = [
  "prompt injection",
  "jailbreak chains",
  "model exfiltration",
  "pii redaction",
  "agent guardrails",
  "vibe-code audit",
  "policy as code",
  "evidence vault",
];

const DEPLOYMENTS = [
  "api",
  "reverse proxy",
  "sdk",
  "vpc sidecar",
  "mcp server",
  "framework plugins",
];

function Row({ items, mono }: { items: string[]; mono?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div
      className="flex overflow-hidden"
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div className="flex w-max animate-marquee items-center gap-12 pr-12">
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-12 whitespace-nowrap">
            <span
              className={
                mono
                  ? "font-mono text-[12px] uppercase tracking-[0.16em] text-faint"
                  : "text-[15px] text-dim"
              }
            >
              {item}
            </span>
            <span className="size-1 rounded-full bg-line-strong" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Marquee() {
  return (
    <section id="context" className="relative z-10 border-y border-line bg-raise/50">
      <div className="mx-auto max-w-[1240px] space-y-5 px-6 py-8">
        <Row items={CAPABILITIES} mono />
        <div className="hairline" />
        <Row items={DEPLOYMENTS} />
      </div>
    </section>
  );
}
