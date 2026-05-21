import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket, Telescope, Lightbulb, Shield, Heart, Star } from "lucide-react";
import { TopBar, SiteHeader, SiteFooter, BRAND } from "@/components/marketing/site-chrome";
import storyImg from "@/assets/marketing/about-story.jpg";
import t1 from "@/assets/marketing/team1.jpg";
import t2 from "@/assets/marketing/team2.jpg";
import t3 from "@/assets/marketing/team3.jpg";

export const Route = createFileRoute("/about-us")({
  head: () => ({
    meta: [
      { title: "About Us — Learniby" },
      { name: "description", content: "Learniby-র গল্প, আমাদের মিশন, ভিশন এবং নেপথ্যের কারিগরদের সাথে পরিচিত হন।" },
      { property: "og:title", content: "About Us — Learniby" },
      { property: "og:description", content: "Making Learning Fun & Future-Ready. আমাদের লক্ষ্য, উদ্দেশ্য ও টিম সম্পর্কে জানুন।" },
      { property: "og:url", content: "https://course.learniby.com/about-us" },
    ],
    links: [{ rel: "canonical", href: "https://course.learniby.com/about-us" }],
  }),
  component: AboutPage,
});

const fontStack =
  "'Plus Jakarta Sans','Hind Siliguri','Noto Sans Bengali',ui-sans-serif,system-ui,sans-serif";

function AboutPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: fontStack }}>
      <TopBar />
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "#EFE7FB" }}>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20 text-center sm:px-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900">
            Making Learning <span style={{ color: BRAND.lime }}>Fun &amp; Future-Ready</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] sm:text-base leading-relaxed text-slate-700">
            আমরা বিশ্বাস করি প্রতিটি শিশুই জিনিয়াস। আমাদের কাজ হলো তাদের সেই সুপ্ত প্রতিভাকে সঠিক গাইডলাইন দিয়ে জাগিয়ে তোলা।
          </p>
        </div>
        {/* wave divider */}
        <svg className="block w-full" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden>
          <path d="M0,40 C240,80 480,0 720,30 C960,60 1200,20 1440,40 L1440,60 L0,60 Z" fill="#ffffff" />
        </svg>
      </section>

      {/* Our Story */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="overflow-hidden rounded-2xl shadow-md">
            <img src={storyImg} alt="Learniby founder story" width={1024} height={896} loading="lazy" className="w-full h-auto object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide" style={{ color: BRAND.lime }}>আমাদের গল্প</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900">
              আমরা যেভাবে শুরু করেছিলাম
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-slate-700">
              Learniby-র যাত্রা একটি বড় স্বপ্ন থেকে—বাংলাদেশের প্রতিটি শিশুর কাছে বিশ্বমানের শিক্ষা পৌঁছে দেওয়া। আমরা লক্ষ্য করেছি, বাচ্চারা প্রথাগত পড়াশোনায় আগ্রহ পায় না; তাই আমরা চিন্তা করলাম এমন একটি প্ল্যাটফর্ম যেখানে শিক্ষা হবে আনন্দের।
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-700">
              আজ আমরা শুধু একটি প্রজেক্ট নই, বরং হাজারো অভিভাবক এবং শিক্ষার্থীর একটি পরিবার। আমাদের নৈতিক দায়িত্ব প্রতিনিয়ত কাজ করে যাচ্ছি আপনার সন্তানের ভবিষ্যৎ গড়ার লক্ষ্যে।
            </p>
            <Link
              to="/all-courses"
              className="mt-7 inline-flex items-center rounded-md px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
              style={{ background: BRAND.lime }}
            >
              আমার কোর্সগুলো
            </Link>
            <p className="mt-8 text-[13px] italic text-slate-600 max-w-md">
              "আমাদের লক্ষ্য শুধু শিক্ষাদান নয়, বরং বাচ্চারা যেন শেখার প্রতি ভালোবাসা তৈরি করে।"
            </p>
            <p className="mt-2 text-sm font-bold" style={{ color: BRAND.primary }}>— Founder, Learniby</p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-slate-900">
            আমাদের <span style={{ color: BRAND.lime }}>লক্ষ্য</span> ও উদ্দেশ্য
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <MVCard
              icon={<Rocket className="h-7 w-7 text-white" />}
              title="Our Mission"
              text="প্রযুক্তি এবং আধুনিক পদ্ধতির সমন্বয়ে শিশুদের জন্য সহজ, এনগেজিং এবং কার্যকর লার্নিং পরিবেশ তৈরি করা।"
              bg={BRAND.primary}
            />
            <MVCard
              icon={<Telescope className="h-7 w-7 text-white" />}
              title="Our Vision"
              text="ভবিষ্যতের চ্যালেঞ্জ মোকাবেলায় সক্ষম, সৃজনশীল এবং আত্মবিশ্বাসী একটি নতুন প্রজন্ম গড়ে তোলা।"
              bg={BRAND.lime}
            />
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 sm:py-20" style={{ background: "#F5EEFC" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl sm:text-4xl font-extrabold" style={{ color: BRAND.primary }}>
            নেপথ্যের কারিগররা
          </h2>
          <p className="mt-3 text-center text-[15px] text-slate-700">
            যাদের অক্লান্ত পরিশ্রমে Learniby এগিয়ে যাচ্ছে।
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <TeamCard img={t1} name="Hasnain Maruf Rafi" role="Chief executive trainer" />
            <TeamCard img={t2} name="Mahmuda Akter Lipy" role="Trainer" />
            <TeamCard img={t3} name="Sumiya Jannat" role="Trained in Abacus" />
          </div>
        </div>
      </section>

      {/* Core values */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-slate-900">
            আমাদের মূলনীতি <span style={{ color: BRAND.lime }}>(Core Values)</span>
          </h2>
          <p className="mt-3 text-center text-[15px] text-slate-700">
            যে বিষয়গুলোতে আমরা কখনো ছাড় দেই না।
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ValueCard icon={<Lightbulb className="h-6 w-6" style={{ color: "#E0A800" }} />} title="Innovation" text="সবসময় নতুন এবং আধুনিক পদ্ধতিতে শিক্ষাদান।" bg="#FCE7F3" />
            <ValueCard icon={<Shield className="h-6 w-6" style={{ color: BRAND.lime }} />} title="Safety First" text="শিশুদের জন্য ১০০% নিরাপদ অনলাইন পরিবেশ।" bg="#DCFCE7" />
            <ValueCard icon={<Heart className="h-6 w-6" style={{ color: "#EF4444" }} />} title="Empathy" text="প্রতিটি শিশুর মানসিক অবস্থা বুঝে ক্লাস নেওয়া।" bg="#DBEAFE" />
            <ValueCard icon={<Star className="h-6 w-6" style={{ color: "#F59E0B" }} />} title="Quality" text="শিক্ষার মানের ক্ষেত্রে আপোষহীন আমরা।" bg="#FFEDD5" />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function MVCard({ icon, title, text, bg }: { icon: React.ReactNode; title: string; text: string; bg: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-md" style={{ background: bg }}>
      <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="relative">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
          {icon}
        </div>
        <h3 className="mt-5 text-2xl font-extrabold">{title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-white/95">{text}</p>
      </div>
    </div>
  );
}

function TeamCard({ img, name, role }: { img: string; name: string; role: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="aspect-[4/5] overflow-hidden bg-slate-100">
        <img src={img} alt={name} width={768} height={896} loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="p-5 text-center">
        <h3 className="text-lg font-extrabold" style={{ color: BRAND.primary }}>{name}</h3>
        <p className="mt-1 text-sm font-semibold" style={{ color: BRAND.lime }}>{role}</p>
      </div>
    </div>
  );
}

function ValueCard({ icon, title, text, bg }: { icon: React.ReactNode; title: string; text: string; bg: string }) {
  return (
    <div className="rounded-2xl p-6 text-center" style={{ background: bg }}>
      <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}
