import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { BLOG_CATEGORIES, BLOG_POSTS } from "@/lib/blog";

const BLOG_KEYWORDS = Array.from(new Set(BLOG_POSTS.flatMap((p) => p.keywords)));

export const metadata: Metadata = {
  title: { absolute: "AI Security Blog | Intellirity" },
  description:
    "Practical AI security writing: prompt injection, LLM and chatbot security, agent risks, API security and a developer checklist. Ten detailed guides.",
  keywords: BLOG_KEYWORDS,
  alternates: { canonical: `${SITE_URL}/blog` },
  robots: { index: true, follow: true },
  openGraph: {
    title: `AI Security Blog · ${SITE_NAME}`,
    description:
      "Practical guides to prompt injection, LLM security, agent security and API security for AI applications.",
    url: `${SITE_URL}/blog`,
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Intellirity AI security blog" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `AI Security Blog · ${SITE_NAME}`,
    description:
      "Practical guides to prompt injection, LLM security, agent security and API security.",
    images: ["/og-image.png"],
  },
};

export default function BlogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        "@id": `${SITE_URL}/blog#blog`,
        name: "Intellirity AI Security Blog",
        url: `${SITE_URL}/blog`,
        description:
          "Practical AI security writing covering prompt injection, LLM security, AI agents and API security.",
        publisher: { "@id": `${SITE_URL}#org` },
        blogPost: BLOG_POSTS.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          url: `${SITE_URL}/blog/${p.slug}`,
          datePublished: p.date,
          description: p.description,
          author: { "@id": `${SITE_URL}/about#founder` },
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/blog#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
        ],
      },
    ],
  };

  return (
    <div className="page-aurora min-h-screen bg-bg text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="border-b border-white/[0.06] bg-black/10 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Intellirity home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            <Link href="/" className="transition-colors hover:text-ink">
              Home
            </Link>
            <Link href="/engines" className="hidden transition-colors hover:text-ink sm:inline">
              Engines
            </Link>
            <Link href="/console" className="transition-colors hover:text-ink">
              Console
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-faint"
        >
          <Link href="/" className="inline-flex min-h-6 items-center transition-colors hover:text-ink">
            {SITE_NAME}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-dim">Blog</span>
        </nav>

        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-steel">
          AI security field notes
        </p>
        <h1 className="mt-4 max-w-[20ch] font-display text-[clamp(2.2rem,5.5vw,3.6rem)] font-medium leading-[1.04] tracking-[-0.03em]">
          Practical AI security, without the theatre.
        </h1>
        <p className="mt-6 max-w-[62ch] text-[16px] leading-relaxed text-dim sm:text-[17px]">
          Ten detailed guides to the attacks and controls that matter when you
          ship models, chatbots and agents: prompt injection, data loss, agent
          authority, API boundaries and the evidence you need after an incident.
        </p>

        <div className="mt-10 flex flex-wrap gap-2">
          {BLOG_CATEGORIES.map((category) => (
            <a
              key={category}
              href={`#${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              className="inline-flex h-8 items-center rounded-full border border-line px-3.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint transition-colors hover:border-line-strong hover:text-ink"
            >
              {category}
            </a>
          ))}
        </div>

        <Link
          href={`/blog/${BLOG_POSTS[0].slug}`}
          className="glass-panel group mt-12 grid gap-6 rounded-2xl p-6 transition-colors hover:border-white/20 sm:p-8 lg:grid-cols-[1.2fr,0.8fr]"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-steel">
              Featured / {BLOG_POSTS[0].category}
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-medium leading-[1.08] tracking-[-0.03em]">
              {BLOG_POSTS[0].title}
            </h2>
            <p className="mt-4 max-w-[58ch] text-[14.5px] leading-relaxed text-dim">
              {BLOG_POSTS[0].description}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-steel">
              Read the guide <span aria-hidden>?</span>
            </span>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-white/[0.07] bg-black/20 p-5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            <span>{BLOG_POSTS[0].readingMinutes} min read</span>
            <span className="mt-8 leading-relaxed normal-case tracking-normal text-dim">
              The 2026 guide to what AI security covers, where traditional controls stop, and the sequence that actually reduces blast radius.
            </span>
            <span className="mt-8 text-steel">Start here</span>
          </div>
        </Link>

        <div className="mt-16 space-y-16">
          {BLOG_CATEGORIES.map((category) => {
            const posts = BLOG_POSTS.filter((p) => p.category === category);
            const anchor = category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <section key={category} id={anchor} className="scroll-mt-24">
                <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-steel">
                    {category}
                  </h2>
                  <span className="font-mono text-[10.5px] text-faint">
                    {String(posts.length).padStart(2, "0")} articles
                  </span>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {posts.map((post) => (
                    <article
                      key={post.slug}
                      className="glass-panel-soft group rounded-2xl p-5 transition-colors hover:border-white/20"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                        {new Date(post.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {" · "}
                        {post.readingMinutes} min read
                      </p>
                      <h3 className="mt-3 text-[19px] font-medium leading-[1.25] tracking-[-0.01em]">
                        <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-white">
                          {post.title}
                        </Link>
                      </h3>
                      <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-dim">
                        {post.description}
                      </p>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-steel transition-colors hover:text-ink"
                      >
                        Read article <span aria-hidden>→</span>
                      </Link>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-20 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-8">
          <Link
            href="/engines"
            className="inline-flex h-10 items-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white"
          >
            See the detection engines
          </Link>
          <Link
            href="/glossary"
            className="inline-flex h-10 items-center rounded border border-line-strong px-5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
          >
            AI security glossary
          </Link>
        </div>
      </main>
    </div>
  );
}
