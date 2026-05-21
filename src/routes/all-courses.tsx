import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter, TopBar } from "@/components/marketing/site-chrome";
import { CourseCard } from "@/components/marketing/CourseCard";
import { MARKETING_COURSES } from "@/components/marketing/courses-data";

const SITE_URL = "https://course.learniby.com";

export const Route = createFileRoute("/all-courses")({
  head: () => ({
    meta: [
      { title: "All Courses — Learniby" },
      { name: "description", content: "Learniby-এর সকল প্রিমিয়াম কোর্স — অ্যাবাকাস মেন্টাল ম্যাথ, ফোনিক্স ও স্পোকেন ইংলিশ। আপনার সন্তানের জন্য সেরা কোর্স বেছে নিন।" },
      { property: "og:title", content: "All Courses — Learniby" },
      { property: "og:description", content: "অ্যাবাকাস ও ইংলিশের লাইভ ইন্টারঅ্যাকটিভ কোর্স — সকল বয়সের শিশুর জন্য।" },
      { property: "og:url", content: SITE_URL + "/all-courses" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/all-courses" }],
  }),
  component: AllCoursesPage,
});

function AllCoursesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans','Hind Siliguri',system-ui,sans-serif" }}>
      <TopBar />
      <SiteHeader />

      <main>
        {/* Hero / page header with wave */}
        <section className="relative overflow-hidden" style={{ background: "#F3E8FF" }}>
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24 sm:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">Our courses</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-700 leading-relaxed">
              আমরা বিশ্বাস করি প্রতিটি শিশুই জিনিয়াস। আমাদের কাজ হলো তাদের সেই সুপ্ত প্রতিভাকে সঠিক গাইডলাইন দিয়ে জাগিয়ে তোলা।
            </p>
          </div>
          {/* Wave divider */}
          <svg className="block w-full" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,40 C360,90 1080,-10 1440,40 L1440,80 L0,80 Z" fill="#ffffff" />
          </svg>
        </section>

        {/* Courses grid */}
        <section className="py-14 sm:py-20" style={{ background: "#FAFAFE" }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {MARKETING_COURSES.map((c) => (
                <CourseCard key={c.slug} c={c} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
