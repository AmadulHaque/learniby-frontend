import { defineRoute, Link } from "@/lib/router-compat";
import { TopBar, SiteHeader, SiteFooter, BRAND } from "@/components/marketing/site-chrome";
import b1 from "@/assets/marketing/blog1.webp";
import b2 from "@/assets/marketing/blog2.webp";
import b3 from "@/assets/marketing/blog3.webp";
import b4 from "@/assets/marketing/blog4.webp";

export const Route = defineRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Learniby" },
      { name: "description", content: "Learniby ব্লগে পড়ুন শিশুদের শিক্ষা, অ্যাবাকাস, সফট স্কিল ও প্যারেন্টিং নিয়ে সর্বশেষ আর্টিকেল।" },
      { property: "og:title", content: "Blog — Learniby" },
      { property: "og:description", content: "শিশুদের শিক্ষা ও দক্ষতা উন্নয়ন নিয়ে আর্টিকেল।" },
      { property: "og:url", content: "https://course.learniby.com/blog" },
    ],
    links: [{ rel: "canonical", href: "https://course.learniby.com/blog" }],
  }),
  component: BlogPage,
});

const fontStack =
  "'Plus Jakarta Sans','Hind Siliguri','Noto Sans Bengali',ui-sans-serif,system-ui,sans-serif";

type Post = { img: string; title: string; excerpt: string; slug: string };

const posts: Post[] = [
  {
    img: b1,
    title: "ক্যাডেট কলেজের লক্ষ্য পূরণ করতেঃ যা যা জানা দরকার",
    excerpt:
      "বহুল প্রতিযোগিতামূলক বাছাই প্রক্রিয়ার কারণে, ক্লাস সিক্সে ওঠার সাথে সাথেই ক্যাডেট কলেজ ভর্তি পরীক্ষার জন্য প্রস্তুতি নিতে দেখা যায় অনেক...",
    slug: "cadet-college-preparation",
  },
  {
    img: b2,
    title: "শিশুদের ব্রেইন ডেভলপমেন্টে সবাই কেন অ্যাবাকাসকে বেছে নিচ্ছে?",
    excerpt:
      "অ্যাবাকাস শিক্ষা বিশ্বের অনেক অংশে জনপ্রিয়, বিশেষত এশিয়ায় যেখানে এটি উদ্ভূত হয়েছিল। অ্যাবাকাস শিক্ষা প্রায়শই ছোট বাচ্চাদের গণিত শেখানোর জন্য...",
    slug: "abacus-brain-development",
  },
  {
    img: b3,
    title: "আপনার সন্তানের গাণিতিক চিন্তাধারা বিকাশিত করবে Singapore Math",
    excerpt:
      "আচ্ছা ধারণা করুন তো, গণিতে পৃথিবীর সেরা কারা? ভাবছেন ভারত, আমেরিকা বা জাপান? বা মালয়েশিয়া? না। দেশটির নাম সিঙ্গাপুর। সিঙ্গাপুরের...",
    slug: "singapore-math",
  },
  {
    img: b4,
    title: "পাবলিক স্পিকিং: বর্তমান বিশ্বের একটি গুরুত্বপূর্ণ সফট স্কিল",
    excerpt:
      "নিজেকে একুশ শতাব্দীর একজন দক্ষ মানবসম্পদে পরিণত করতে হলে যেসব সফট স্কিল অর্জন করা প্রয়োজন, তার মধ্যে এই পাবলিক স্পিকিং...",
    slug: "public-speaking",
  },
];

function BlogPage() {
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: fontStack }}>
      <TopBar />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:py-16 sm:px-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Blog</h1>

        <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <article key={p.slug} className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
              <Link to="/blog" className="block">
                <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                  <img
                    src={p.img}
                    alt={p.title}
                    width={768}
                    height={429}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                  />
                </div>
                <div className="p-6">
                  <h2 className="text-[17px] font-extrabold leading-snug text-slate-900 line-clamp-2 transition group-hover:text-[color:var(--lb-p)]" style={{ ["--lb-p" as never]: BRAND.primary }}>
                    {p.title}
                  </h2>
                  <p className="mt-4 text-[14px] leading-relaxed text-slate-600 line-clamp-4">
                    {p.excerpt}
                  </p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
