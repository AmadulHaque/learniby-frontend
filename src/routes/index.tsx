import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import logo from "@/assets/learniby-logo.webp";

const SITE_URL = "https://course.learniby.com";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learniby — বাংলায় প্রিমিয়াম রেকর্ডেড কোর্স" },
      { name: "description", content: "Learniby — বাংলায় প্রিমিয়াম রেকর্ডেড কোর্স পোর্টাল। যেকোনো জায়গা থেকে শিখুন, নিজের গতিতে এগিয়ে যান।" },
      { property: "og:title", content: "Learniby — বাংলায় প্রিমিয়াম রেকর্ডেড কোর্স" },
      { property: "og:description", content: "বাংলায় প্রিমিয়াম রেকর্ডেড কোর্স পোর্টাল। মোবাইল-ফ্রেন্ডলি, ব্যাচ-ভিত্তিক, যেকোনো সময় রিভিশন।" },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Learniby",
              url: SITE_URL,
              logo: SITE_URL + "/favicon.ico",
            },
            {
              "@type": "WebSite",
              name: "Learniby",
              url: SITE_URL,
            },
          ],
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b-2 border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2" aria-label="Learniby home">
            <img src={logo} alt="Learniby learning portal logo" className="h-9 w-auto sm:h-10" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/course/login">
              <Button variant="ghost" size="sm" className="rounded-full font-bold">লগইন</Button>
            </Link>
            <Link to="/course">
              <Button size="sm" className="rounded-full font-bold">কোর্স পোর্টাল</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-20 sm:py-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary">
            🚀 শীঘ্রই আসছে
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Learniby —{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              শিখুন স্মার্ট
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            বাংলায় প্রিমিয়াম রেকর্ডেড কোর্স। যেকোনো জায়গা থেকে শিখুন, নিজের গতিতে এগিয়ে যান।
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/course">
              <Button size="lg" className="rounded-full font-bold">কোর্স পোর্টালে যান</Button>
            </Link>
            <Link to="/course/register">
              <Button size="lg" variant="outline" className="rounded-full font-bold">নতুন অ্যাকাউন্ট</Button>
            </Link>
          </div>
        </div>

        <section className="mt-20">
          <h2 className="sr-only">কেন Learniby</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { t: "📚 রেকর্ডেড ক্লাস", d: "যেকোনো সময় দেখুন, রিভিশন দিন।" },
              { t: "🎯 ব্যাচ-ভিত্তিক", d: "অ্যাডমিন-নিয়ন্ত্রিত নিরাপদ অ্যাক্সেস।" },
              { t: "📱 মোবাইল-ফ্রেন্ডলি", d: "যেকোনো ডিভাইস থেকে নির্বিঘ্নে।" },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border-2 border-border bg-card p-6">
                <h3 className="text-lg font-bold">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Learniby. All rights reserved.
      </footer>
    </div>
  );
}
