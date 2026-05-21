import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { MapPin, Phone, Mail } from "lucide-react";
import { TopBar, SiteHeader, SiteFooter, BRAND } from "@/components/marketing/site-chrome";
import { toast } from "sonner";

export const Route = createFileRoute("/contact-us")({
  head: () => ({
    meta: [
      { title: "Contact Us — Learniby" },
      { name: "description", content: "Learniby এর সাথে যোগাযোগ করুন। হেড অফিস, ফোন, ইমেইল এবং অফিস সময়সূচী।" },
      { property: "og:title", content: "Contact Us — Learniby" },
      { property: "og:description", content: "Get in touch with Learniby — phone, email, address & contact form." },
      { property: "og:url", content: "https://course.learniby.com/contact-us" },
    ],
    links: [{ rel: "canonical", href: "https://course.learniby.com/contact-us" }],
  }),
  component: ContactPage,
});

const fontStack =
  "'Plus Jakarta Sans','Hind Siliguri','Noto Sans Bengali',ui-sans-serif,system-ui,sans-serif";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Invalid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

const hours: Array<[string, string]> = [
  ["Monday", "8:00 – 17:00"],
  ["Tuesday", "8:00 – 17:00"],
  ["Wednesday", "8:00 – 17:00"],
  ["Thursday", "8:00 – 17:00"],
  ["Friday", "8:00 – 17:00"],
  ["Saturday", "10:00 – 16:00"],
  ["Sunday", "CLOSED"],
];

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = contactSchema.safeParse({
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      email: fd.get("email"),
      subject: fd.get("subject"),
      message: fd.get("message"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      (e.target as HTMLFormElement).reset();
      toast.success("Thank you! We'll get back to you soon.");
    }, 500);
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: fontStack }}>
      <TopBar />
      <SiteHeader />

      {/* Hero */}
      <section
        className="relative"
        style={{ background: "linear-gradient(110deg, #E6F2EC 0%, #F2EAF7 60%, #FCE7F0 100%)" }}
      >
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:pt-20 sm:px-6 text-center">
          <p className="text-sm font-extrabold tracking-[0.18em]" style={{ color: "#F97316" }}>
            GET IN TOUCH WITH US
          </p>
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold text-slate-900">
            Contact information
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Learniby was founded in 2024 with a mission to make learning fun and accessible for kids.
            Every day, we strive to improve and deliver the best learning experience possible.
            We're always ready to answer your questions and provide dedicated support.
          </p>
        </div>

        {/* Content cards */}
        <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-6">
              <Card>
                <h2 className="text-2xl font-extrabold text-slate-900">Head office</h2>
                <ul className="mt-6 space-y-4 text-[15px] text-slate-700">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded" style={{ color: BRAND.primary }}>
                      <MapPin className="h-5 w-5" />
                    </span>
                    <span>106/A, Ahmded Nagar, Mirpur 01, Dhaka-12</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded" style={{ color: BRAND.primary }}>
                      <Phone className="h-5 w-5" />
                    </span>
                    <span>
                      <strong className="font-semibold">Phone :</strong>{" "}
                      <a href="tel:+8801631242303" className="hover:underline">+880 1631-242303</a>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded" style={{ color: BRAND.primary }}>
                      <Mail className="h-5 w-5" />
                    </span>
                    <span>
                      <strong className="font-semibold">Email :</strong>{" "}
                      <a href="mailto:info@learniby.com" className="hover:underline">info@learniby.com</a>
                    </span>
                  </li>
                </ul>
              </Card>

              <Card>
                <h2 className="text-2xl font-extrabold text-slate-900">Opening hours</h2>
                <ul className="mt-6 space-y-2 text-[15px] text-slate-700">
                  {hours.map(([day, time]) => (
                    <li key={day}>
                      <strong className="font-bold">{day}:</strong>{" "}
                      <span className={time === "CLOSED" ? "font-semibold text-rose-600" : ""}>{time}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Right column - form */}
            <Card>
              <h2 className="text-2xl font-extrabold text-slate-900">Get in touch</h2>
              <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input name="firstName" placeholder="First Name" required maxLength={80} />
                  <Input name="lastName" placeholder="Last Name" required maxLength={80} />
                </div>
                <Input name="email" type="email" placeholder="Email Address" required maxLength={255} />
                <Input name="subject" placeholder="Subject" required maxLength={200} />
                <textarea
                  name="message"
                  placeholder="Your Message"
                  required
                  maxLength={2000}
                  rows={6}
                  className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-transparent focus:ring-2"
                  style={{ ["--tw-ring-color" as never]: BRAND.primary }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-slate-900 px-7 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Submit"}
                </button>
              </form>
            </Card>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-7 sm:p-8 shadow-sm ring-1 ring-slate-100">
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-transparent focus:ring-2"
      style={{ ["--tw-ring-color" as never]: BRAND.primary }}
    />
  );
}
