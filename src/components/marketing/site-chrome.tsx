import { Link } from "@/lib/router-compat";
import { Phone, Facebook, Instagram, Youtube, MapPin, Mail } from "lucide-react";
import logo from "@/assets/marketing/learniby-logo.webp";

export const BRAND = {
  primary: "#5B21B6",
  primaryDeep: "#4C1D95",
  lime: "#84CC16",
};

const navItems = [
  { label: "Home", to: "/" as const },
  { label: "All Courses", to: "/all-courses" as const },
  { label: "About Us", to: "/about-us" as const },
  { label: "Blog", to: "/blog" as const },
  { label: "Contact Us", to: "/contact-us" as const },
];

export function TopBar() {
  return (
    <div className="w-full text-white text-xs sm:text-sm" style={{ background: BRAND.primary }}>
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2">
        <Phone className="h-3.5 w-3.5" />
        <span>Have questions? Call us: +880 1631-242303</span>
      </div>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center" aria-label="Learniby home">
          <img src={logo} alt="Learniby logo" className="h-10 sm:h-12 w-auto" />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              activeOptions={{ exact: true }}
              className="text-[15px] font-semibold text-slate-700 transition-colors hover:text-[color:var(--lb-p)]"
              activeProps={{ style: { color: BRAND.primary } }}
              style={{ ["--lb-p" as never]: BRAND.primary }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/login"
            className="rounded-md px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            style={{ background: BRAND.primary }}
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="text-white" style={{ background: BRAND.primary }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <img src={logo} alt="Learniby logo" className="h-10 w-auto brightness-0 invert" />
          <p className="mt-5 text-sm leading-relaxed text-white/85 max-w-xs">
            Empowering Bangladeshi kids with future-ready skills like Abacus Math &amp; Phonics. Smart learning starts here.
          </p>
          <div className="mt-6 flex items-center gap-3">
            {[
              { icon: Facebook, href: "https://facebook.com/learniby", label: "Facebook" },
              { icon: Instagram, href: "https://instagram.com/learniby", label: "Instagram" },
              { icon: Youtube, href: "https://www.youtube.com/@Learniby-4", label: "YouTube" },
              { icon: TikTokIcon, href: "https://tiktok.com/@learniby", label: "TikTok" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white hover:text-[color:var(--lb-p)]"
                style={{ ["--lb-p" as never]: BRAND.primary }}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <FooterCol title="Quick Links">
          <FooterLink to="/about-us">About us</FooterLink>
          <FooterLink to="/all-courses">All Courses</FooterLink>
          <FooterLink to="/contact-us">Contact Us</FooterLink>
          <FooterLink to="/">Career</FooterLink>
        </FooterCol>

        {/* Legal & Policy */}
        <FooterCol title="Legal & Policy">
          <FooterLink to="/">Terms and Condition</FooterLink>
          <FooterLink to="/">Privacy policy</FooterLink>
          <FooterLink to="/">Refund policy</FooterLink>
        </FooterCol>

        {/* Get in touch */}
        <div>
          <h3 className="text-lg font-extrabold" style={{ color: BRAND.lime }}>Get in touch</h3>
          <ul className="mt-5 space-y-3 text-sm text-white/90">
            <li className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" />
              <a href="tel:+8801631242303" className="hover:underline">+880 1631-242303</a>
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <a href="mailto:info@learniby.com" className="hover:underline">info@learniby.com</a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Get Fit Gym, 252/4/2-A Barek Mollar mor, Kamal Soroni Rd, Dhaka, Bangladesh</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-white/80 sm:flex-row sm:px-6">
          <p>Copyright {new Date().getFullYear()} LearniBy. All rights reserved.</p>
          <p>Developed by Digicare BD</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-extrabold" style={{ color: BRAND.lime }}>{title}</h3>
      <ul className="mt-5 space-y-3 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: "/" | "/all-courses" | "/about-us" | "/contact-us"; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-white/90 transition hover:text-white hover:underline">{children}</Link>
    </li>
  );
}

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V9.32a8.16 8.16 0 0 0 4.77 1.52V7.39a4.85 4.85 0 0 1-1.84-.7z"/>
    </svg>
  );
}
