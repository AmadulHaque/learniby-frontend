import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Star,
  GraduationCap,
  Check,
  Brain,
  Gamepad2,
  ShieldCheck,
  Clock,
  Target,
  Heart,
  Users,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { TopBar, SiteHeader, SiteFooter } from "@/components/marketing/site-chrome";

import heroKid from "@/assets/marketing/hero-kid.jpg";
import c1 from "@/assets/marketing/c1.webp";
import c2 from "@/assets/marketing/c2.webp";
import c3 from "@/assets/marketing/c3.webp";
import c4 from "@/assets/marketing/c4.webp";
import c5 from "@/assets/marketing/c5.webp";
import classroom1 from "@/assets/marketing/classroom1.webp";
import classroom2 from "@/assets/marketing/classroom2.webp";
import classroom3 from "@/assets/marketing/classroom3.webp";
import successImg from "@/assets/marketing/success.webp";

const SITE_URL = "https://course.learniby.com";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learniby — বাংলাদেশের প্রিমিয়াম অনলাইন লার্নিং প্ল্যাটফর্ম" },
      {
        name: "description",
        content:
          "আপনার সন্তানের সুপ্ত প্রতিভা উন্মোচন করুন। বাংলাদেশের প্রথম প্রিমিয়াম অনলাইন লার্নিং প্ল্যাটফর্ম — অ্যাবাকাস, ফোনিক্স ও স্পোকেন ইংলিশ কোর্স।",
      },
      { property: "og:title", content: "Learniby — বাংলাদেশের প্রিমিয়াম অনলাইন লার্নিং প্ল্যাটফর্ম" },
      {
        property: "og:description",
        content: "ভেরিফাইড মেন্টর, লাইভ ইন্টারঅ্যাকটিভ ক্লাস, ১০০% নিরাপদ প্ল্যাটফর্ম।",
      },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
  }),
  component: HomePage,
});

const PRIMARY = "#5B21B6"; // deep purple matching brand
const LIME = "#84CC16"; // lime/accent

function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans','Hind Siliguri',system-ui,sans-serif" }}>
      <TopBar />
      <SiteHeader />
      <main>
        <Hero />
        <StatsBar />
        <WhyTrust />
        <ThreeSteps />
        <PopularCourses />
        <SuccessStories />
        <StudentFeatures />
        <BigCommunityCTA />
        <ReadyCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-2 lg:gap-12 lg:py-20 sm:px-6">
        {/* Left */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-slate-900">
            আপনার সন্তানের সুপ্ত
            <br />
            প্রতিভা{" "}
            <span style={{ color: LIME }}>উন্মোচন করুন</span>
          </h1>
          <p className="mt-6 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
            বাংলাদেশের প্রথম প্রিমিয়াম অনলাইন লার্নিং প্ল্যাটফর্ম। আপনার সন্তানের
            মেধা বিকাশ এবং ফিউচার স্কিল গড়ার সেরা ঠিকানা।
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#courses"
              className="rounded-md px-6 py-3 text-sm font-bold text-white shadow-md hover:brightness-110 transition"
              style={{ background: LIME }}
            >
              Explore Courses
            </a>
            <a
              href="https://www.youtube.com/@Learniby-4"
              target="_blank" rel="noreferrer"
              className="rounded-md border-2 px-6 py-3 text-sm font-bold transition hover:bg-slate-50"
              style={{ borderColor: PRIMARY, color: PRIMARY }}
            >
              Watch Demo
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-medium text-slate-700">
            {["ভেরিফাইড মেন্টর", "লাইভ ইন্টারঅ্যাকটিভ ক্লাস", "১০০% নিরাপদ প্ল্যাটফর্ম"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full" style={{ background: LIME }}>
                  <Check className="h-3.5 w-3.5 text-white" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Right image */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl shadow-xl">
            <img
              src={heroKid}
              alt="Learniby শিক্ষার্থী অ্যাবাকাস ও ট্যাবলেট ব্যবহার করছে"
              width={1280}
              height={960}
              className="w-full h-auto object-cover"
            />
          </div>
          {/* Rating chip */}
          <div className="absolute left-4 top-6 sm:-left-6 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-100">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-slate-900">4.9/5 Rating</span>
          </div>
          {/* Certified chip */}
          <div className="absolute right-4 top-6 sm:-right-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-100">
            <GraduationCap className="h-5 w-5" style={{ color: PRIMARY }} />
            <span className="font-bold text-slate-900">Certified Kids</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Stats bar ---------- */
function StatsBar() {
  const stats = [
    { num: "724+", label: "হ্যাপি স্টুডেন্ট" },
    { num: "10+", label: "এক্সপার্ট মেন্টর" },
    { num: "325+", label: "সফল লাইভ ক্লাস" },
    { num: "70%", label: "প্যারেন্টস স্যাটিসফ্যাকশন" },
  ];
  return (
    <section
      className="relative py-10"
      style={{
        background: PRIMARY,
        backgroundImage:
          "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-4 sm:px-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/5 px-4 py-6 text-center ring-1 ring-white/10">
            <div className="text-3xl sm:text-4xl font-extrabold" style={{ color: LIME }}>{s.num}</div>
            <div className="mt-1 text-xs sm:text-sm font-medium text-white/90">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Why Trust ---------- */
function WhyTrust() {
  const items = [
    {
      icon: <Brain className="h-7 w-7" />,
      iconBg: "#FCE7F3",
      iconColor: "#EC4899",
      cardBg: "#F5E8FF",
      title: "ব্রেইন ডেভেলপমেন্ট ফোকাসড",
      desc: "আমাদের কোর্সগুলো (যেমন অ্যাবাকাস) শিশুর মস্তিষ্কের উভয় পাশকে সক্রিয় করতে ডিজাইন করা হয়েছে।",
    },
    {
      icon: <Gamepad2 className="h-7 w-7" />,
      iconBg: "#EDE9FE",
      iconColor: "#7C3AED",
      cardBg: "#E7F5E8",
      title: "গেম-বেসড লার্নিং",
      desc: "বোরিং লেকচার নয়, বাচ্চারা শিখবে গেম এবং আনন্দের মাধ্যমে। যা তাদের ক্লাসে আগ্রহী রাখে।",
    },
    {
      icon: <ShieldCheck className="h-7 w-7" />,
      iconBg: "#DBEAFE",
      iconColor: "#2563EB",
      cardBg: "#DDEEFB",
      title: "কিডস-সেফ এনভায়রনমেন্ট",
      desc: "সম্পূর্ণ নিরাপদ অনলাইন পরিবেশ এবং সার্বক্ষণিক মনিটরিং ব্যবস্থা।",
    },
  ];
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            কেন অভিভাবকরা <span style={{ color: LIME }}>Learniby</span>'কে বিশ্বাস করেন !
          </h2>
          <p className="mt-3 text-slate-600">
            আমরা গতানুগতিক শিক্ষার বাইরে গিয়ে শিশুর প্রকৃত মেধা বিকাশে কাজ করি।
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((i) => (
            <div key={i.title} className="rounded-3xl p-8 text-center transition hover:-translate-y-1 hover:shadow-lg" style={{ background: i.cardBg }}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <span style={{ color: i.iconColor }}>{i.icon}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{i.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{i.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 3 Steps ---------- */
function ThreeSteps() {
  const steps = [
    { n: 1, title: "ফ্রি রেজিস্ট্রেশন", desc: "অভিভাবক হিসেবে খুব সহজেই একটি ফ্রি অ্যাকাউন্ট তৈরি করুন।" },
    { n: 2, title: "কোর্স সিলেক্ট", desc: "বাচ্চার বয়স ও আগ্রহ অনুযায়ী পছন্দের কোর্সটি বেছে নিন।" },
    { n: 3, title: "লাইভ ক্লাস", desc: "শিডিউল অনুযায়ী এক্সপার্ট মেন্টরের সাথে ক্লাস শুরু করুন।" },
  ];
  return (
    <section className="relative py-16 sm:py-20" style={{ background: "#FFF8E1" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl sm:text-4xl font-extrabold" style={{ color: PRIMARY }}>
          লার্নিং শুরু করুন ৩ ধাপে
        </h2>

        <div className="relative mt-14 grid gap-12 md:grid-cols-3">
          {/* dashed connector */}
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-8 hidden md:block">
            <div className="h-px border-t-2 border-dashed border-slate-300" />
          </div>
          {steps.map((s) => (
            <div key={s.n} className="relative text-center">
              <div
                className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold ring-2"
                style={{ color: PRIMARY, boxShadow: "0 4px 12px rgba(0,0,0,0.06)", borderColor: PRIMARY }}
              >
                {s.n}
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Popular Courses ---------- */
function PopularCourses() {
  const courses = [
    { img: c1, badge: "🎯 Teacher Training", time: "6 Months", title: "Certified Abacus Trainer Course", desc: "সার্টিফাইড অ্যাবাকাস ট্রেইনার হয়ে নিজের ক্যারিয়ার গড়ুন।" },
    { img: c2, badge: "🎯 বয়স: ৮-১২ বছর", time: "06 Months", title: "Phonics & Spoken English for Junior", desc: "সঠিক উচ্চারণে ফ্লুয়েন্টলি ইংরেজিতে কথা বলা শিখুন।" },
    { img: c3, badge: "🎯 বয়স: ৫-৮ বছর", time: "05 Months", title: "Abacus Mental Math & Brain Development for Kids", desc: "ক্যালকুলেটর ছাড়াই দ্রুত গণিত করার জাদুকরী কৌশল শিখুন।" },
    { img: c4, badge: "🎯 বয়স: ৮-১৪ বছর", time: "02 Months", title: "Abacus Mental Math & Brain Development for Junior", desc: "গণিতের ভীতি কাটিয়ে মেধা ও মনোযোগ বৃদ্ধির সেরা উপায়।" },
    { img: c5, badge: "🎯 বয়স: ৪-৭ বছর", time: "06 Months", title: "Phonics-&-Spoken-English-for-Kids", desc: "খেলার ছলে শুদ্ধ উচ্চারণে ইংরেজি পড়ার ভিত্তি গড়ুন।" },
  ];
  return (
    <section id="courses" className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            আমাদের জনপ্রিয় <span style={{ color: LIME }}>কোর্সসমূহ</span>
          </h2>
          <p className="mt-3 text-slate-600">ফিউচার লিডার তৈরির জন্য আমাদের স্পেশাল কোর্স।</p>
        </div>

        <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <article key={c.title} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative">
                <img loading="lazy" src={c.img} alt={c.title} width={600} height={400} className="h-52 w-full object-cover" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-red-500 px-2 py-1 text-[11px] font-bold text-white shadow">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
                </span>
              </div>

              <div className="p-5">
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />{c.badge.replace("🎯 ", "")}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{c.time}</span>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">{c.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-2">{c.desc}</p>

                <a href="#" className="mt-5 block w-full rounded-lg border-2 px-4 py-2.5 text-center text-sm font-bold transition hover:bg-lime-50" style={{ borderColor: LIME, color: LIME }}>
                  বিস্তারিত দেখুন
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Success Stories ---------- */
function SuccessStories() {
  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
            খুদে শিক্ষার্থীদের <span style={{ color: LIME }}>সাফল্যের গল্প</span>
          </h2>
          <p className="mt-3 text-slate-600">আমাদের ক্লাসরুমের কিছু আনন্দঘন মুহূর্ত।</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[classroom1, classroom2, classroom3].map((img, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <img loading="lazy" src={img} alt={`Learniby live class snapshot ${i + 1}`} width={800} height={500} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Student Features (4 cards with image bg) ---------- */
function StudentFeatures() {
  const items = [
    { icon: Heart, title: "ওয়ান-টু-ওয়ান কেয়ার", desc: "প্রতিটি শিশুর মেধা ও শেখার গতি অনুযায়ী স্পেশাল যত্ন নেওয়া হয়।", bg: "linear-gradient(135deg,#6D28D9,#4C1D95)" },
    { icon: Users, title: "ব্যাচ-বেসড লার্নিং", desc: "সমবয়সী বন্ধুদের সাথে কম্পিটিশন এবং আনন্দের মাধ্যমে শেখা।", bg: "linear-gradient(135deg,#0EA5E9,#0369A1)" },
    { icon: FileCheck, title: "ফ্রি ইংলিশ অ্যাসেসমেন্ট", desc: "আপনার সন্তানের বর্তমান স্কিল যাচাই করতে ফ্রি টেস্ট দেওয়ার সুযোগ।", bg: "linear-gradient(135deg,#06B6D4,#0E7490)" },
    { icon: Sparkles, title: "লাইভ প্রজেক্ট ওয়ার্ক", desc: "হাতে-কলমে শেখার জন্য ক্রিয়েটিভ সব প্রজেক্ট এবং অ্যাক্টিভিটি।", bg: "linear-gradient(135deg,#F59E0B,#B45309)" },
  ];
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl sm:text-4xl font-extrabold" style={{ color: LIME }}>
          ১০০০+ স্টুডেন্ট <span className="text-slate-900">আমাদের সাথে</span>
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, ...i }) => (
            <div key={i.title} className="group relative overflow-hidden rounded-3xl p-7 text-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl" style={{ background: i.bg, minHeight: 260 }}>
              <Icon className="h-10 w-10 opacity-90" />
              <h3 className="mt-6 text-xl font-extrabold leading-snug">{i.title}</h3>
              <p className="mt-3 text-sm text-white/90 leading-relaxed">{i.desc}</p>
              <div className="pointer-events-none absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Big community CTA with side image ---------- */
function BigCommunityCTA() {
  const bullets = [
    { t: "Growing Learning Community:", d: "Over 100 students and parents have placed their trust in our innovative and interactive teaching methods." },
    { t: "Proven Student Success:", d: "Our students consistently demonstrate growth in confidence and creativity through our engaging curriculum." },
    { t: "Dedicated Expert Mentorship:", d: "Every student receives personalized guidance from experienced mentors to ensure they reach their true potential." },
    { t: "Building Future-Ready Skills:", d: "We empower children with essential skills like Abacus and Phonics, preparing them for tomorrow's challenges." },
  ];
  return (
    <section className="py-16 sm:py-20" style={{ background: "#F5F3FF" }}>
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">100+ Students With Us</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            At Learniby, we are proud to have over 100 students building their future with us. This milestone reflects the trust parents place in our interactive methods. Join our growing community, where expert mentors guide children to unlock their true potential through fun and engaging learning experiences every single day.
          </p>
          <ul className="mt-6 space-y-4">
            {bullets.map((b) => (
              <li key={b.t} className="flex gap-3">
                <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: LIME }}>
                  <Check className="h-3.5 w-3.5 text-white" />
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  <strong className="text-slate-900">{b.t}</strong> {b.d}
                </p>
              </li>
            ))}
          </ul>
          <a href="#" className="mt-8 inline-flex rounded-md px-6 py-3 text-sm font-bold text-white shadow hover:brightness-110" style={{ background: PRIMARY }}>
            Contact Us
          </a>
        </div>

        <div className="relative">
          <img loading="lazy" src={successImg} alt="Learniby classroom community with students and mentor" width={900} height={900} className="w-full rounded-3xl shadow-xl" />
        </div>
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */
function ReadyCTA() {
  return (
    <section
      className="relative overflow-hidden py-16 sm:py-20 text-white"
      style={{ background: `linear-gradient(135deg, ${PRIMARY}, #4C1D95)` }}
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold">Ready to Build a Bright Future?</h2>
        <p className="mt-4 text-white/85">
          Join Learniby, the platform trusted by thousands of parents, today.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard/register" className="rounded-md px-6 py-3 text-sm font-bold text-slate-900 shadow hover:brightness-110" style={{ background: LIME }}>
            Get Started
          </Link>
          <a href="#courses" className="rounded-md border-2 border-white/70 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
            Explore Courses
          </a>
        </div>
      </div>
    </section>
  );
}
