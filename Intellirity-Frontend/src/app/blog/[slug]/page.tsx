import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/site/logo";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { BLOG_POSTS, getPost } from "@/lib/blog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Article not found" };

  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: { absolute: `${post.title} | Intellirity` },
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.date,
      authors: ["Shreyansh Krishna"],
      section: post.category,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/og-image.png"],
    },
  };
}

function inline(text: string) {
  const parts = text.split("**");
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-medium text-ink">{part}</strong> : <span key={i}>{part}</span>
  );
}

function Body({ body }: { body: string }) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    out.push(
      <ul key={`ul-${out.length}`} className="mt-5 space-y-2.5 pl-1">
        {list.map((item, i) => {
          const check = item.startsWith("[ ] ");
          return (
            <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-dim">
              <span aria-hidden className="mt-[2px] shrink-0 font-mono text-[11px] text-steel">
                {check ? "☐" : "—"}
              </span>
              <span>{inline(check ? item.slice(4) : item)}</span>
            </li>
          );
        })}
      </ul>
    );
    list = [];
  };

  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flushList();
      out.push(
        <h2
          key={`h2-${out.length}`}
          className="mt-10 font-display text-[23px] font-medium leading-[1.25] tracking-[-0.02em] text-ink sm:text-[26px]"
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList();
    } else if (line.startsWith("> ")) {
      flushList();
      out.push(
        <blockquote
          key={`q-${out.length}`}
          className="mt-5 border-l-2 border-steel/40 pl-4 text-[15px] italic leading-relaxed text-dim"
        >
          {inline(line.slice(2))}
        </blockquote>
      );
    } else {
      flushList();
      out.push(
        <p key={`p-${out.length}`} className="mt-4 text-[15.5px] leading-[1.8] text-dim">
          {inline(line)}
        </p>
      );
    }
  }
  flushList();
  return <div className="mt-6">{out}</div>;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.date,
        articleSection: post.category,
        keywords: post.keywords.join(", "),
        wordCount: post.body.split(/\s+/).length,
        inLanguage: "en",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: { "@id": `${SITE_URL}/about#founder` },
        publisher: { "@id": `${SITE_URL}#org` },
        image: `${SITE_URL}/og-image.png`,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  const more = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Intellirity home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
            <Link href="/blog" className="transition-colors hover:text-ink">
              All articles
            </Link>
            <Link href="/console" className="transition-colors hover:text-ink">
              Console
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[780px] px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 font-mono text-[11px] uppercase tracking-[0.14em] text-faint"
        >
          <Link href="/" className="inline-flex min-h-6 items-center transition-colors hover:text-ink">
            {SITE_NAME}
          </Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="inline-flex min-h-6 items-center transition-colors hover:text-ink">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span className="text-dim">{post.category}</span>
        </nav>

        <article>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-steel">
            {post.category}
          </p>
          <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.2rem)] font-medium leading-[1.06] tracking-[-0.03em]">
            {post.title}
          </h1>
          <p className="mt-5 max-w-[64ch] text-[17px] leading-relaxed text-dim">
            {post.description}
          </p>
          <p className="mt-6 border-b border-line pb-6 font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
            {new Date(post.date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {post.readingMinutes} min read
            {" · "}
            Shreyansh Krishna
          </p>

          <Body body={post.body} />
        </article>

        <section className="mt-14 border-t border-line pt-8">
          <h2 className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-steel">
            Related controls
          </h2>
          <ul className="mt-4 space-y-2">
            {post.related.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[14.5px] text-dim underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12 rounded-lg border border-line bg-raise/30 p-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-steel">
            Keep reading
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {more.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group rounded border border-line p-4 transition-colors hover:border-line-strong"
              >
                <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">
                  {p.category}
                </p>
                <p className="mt-2 text-[14.5px] font-medium leading-snug">{p.title}</p>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/engines"
            className="inline-flex h-10 items-center rounded bg-ink px-5 text-[13px] font-medium text-bg transition-colors hover:bg-white"
          >
            See the sixteen engines
          </Link>
          <Link
            href="/blog"
            className="inline-flex h-10 items-center rounded border border-line-strong px-5 text-[13px] font-medium text-ink transition-colors hover:border-ink/40"
          >
            Back to all articles
          </Link>
        </div>
      </main>
    </div>
  );
}
