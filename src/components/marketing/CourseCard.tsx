import { Clock, Target } from "lucide-react";
import type { MarketingCourse } from "./courses-data";
import { BRAND } from "./site-chrome";

export function CourseCard({ c }: { c: MarketingCourse }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        <img loading="lazy" src={c.img} alt={c.title} width={600} height={400} className="h-52 w-full object-cover" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-red-500 px-2 py-1 text-[11px] font-bold text-white shadow">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
        </span>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" style={{ color: BRAND.primary }} />{c.badge}</span>
          <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" style={{ color: BRAND.primary }} />{c.time}</span>
        </div>

        <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">{c.title}</h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-2">{c.desc}</p>

        <a href="#" className="mt-5 block w-full rounded-lg border-2 px-4 py-2.5 text-center text-sm font-bold transition hover:bg-lime-50" style={{ borderColor: BRAND.lime, color: BRAND.lime }}>
          বিস্তারিত দেখুন
        </a>
      </div>
    </article>
  );
}
