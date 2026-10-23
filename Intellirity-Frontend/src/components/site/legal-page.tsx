import Link from "next/link";
import { LEGAL_DOCS } from "@/lib/legal";
import { SITE_NAME } from "@/lib/site";

/* Renders a policy document as a real, crawlable page. The same content
   backs the footer modals, so there is one version of every policy. */
export function LegalPage({ docKey }: { docKey: string }) {
  const doc = LEGAL_DOCS[docKey];
  if (!doc) return null;

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
      <nav aria-label="Breadcrumb" className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
        <Link href="/" className="transition-colors hover:text-ink">
          {SITE_NAME}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-dim">{doc.title}</span>
      </nav>

      <article>
        <h1 className="text-[34px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
          {doc.title}
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
          {doc.updated}
        </p>
        <p className="mt-6 text-[17px] leading-relaxed text-dim">{doc.summary}</p>

        {doc.sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-steel">
              {s.heading}
            </h2>
            {s.body.map((p, i) => (
              <p key={i} className="mt-3 text-[15px] leading-[1.75] text-dim">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
