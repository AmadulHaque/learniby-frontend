import { defineRoute, useNavigate, useRouterState } from "@/lib/router-compat";
import { motion, useAnimationControls } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSalesAuth } from "@/contexts/SalesAuthContext";

export const Route = defineRoute("/sales/login")({
  head: () => ({
    meta: [
      { title: "Login — Learniby LMS" },
      { name: "description", content: "Learniby Sales Panel sign in." },
    ],
  }),
  component: SalesLoginPage,
});

function SalesLoginPage() {
  const { signIn, salesUser, loading } = useSalesAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [bannerErr, setBannerErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const cardCtl = useAnimationControls();

  // Redirect if already signed in
  useEffect(() => {
    if (!loading && salesUser && pathname === "/sales/login") {
      navigate({ to: "/sales" });
    }
  }, [loading, salesUser, pathname, navigate]);

  const validateEmail = (v: string) => {
    if (!v.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Enter a valid email";
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const eErr = validateEmail(email);
    const pErr = !password ? "Password is required" : null;
    setEmailErr(eErr);
    setPwdErr(pErr);
    setBannerErr(null);
    if (eErr || pErr) return;

    setSubmitting(true);
    const { error } = await signIn(email, password, remember);
    if (error) {
      setSubmitting(false);
      setBannerErr(error.includes("credentials") || error.toLowerCase().includes("invalid") ? "Invalid email or password. Please try again." : error);
      cardCtl.start({ x: [0, -10, 10, -8, 8, -4, 0], transition: { duration: 0.45 } });
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate({ to: "/sales" }), 700);
  };

  return (
    <div className="sales-theme min-h-screen bg-background text-foreground">
      <div
        className="min-h-screen flex"
        style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #4F46E5 100%)" }}
      >
        {/* LEFT — pitch (hidden on small) */}
        <div className="hidden lg:flex lg:w-3/5 flex-col justify-center px-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              Learniby LMS
            </div>
            <h1 className="mt-6 text-5xl xl:text-6xl font-extrabold tracking-tight leading-tight">
              Sell Smarter.<br />Close Faster.
            </h1>
            <p className="mt-5 text-lg text-white/80 max-w-md">
              Learniby's sales team command center.
            </p>
            <ul className="mt-10 space-y-3 max-w-md">
              {[
                "Track every lead in real-time",
                "Never miss a follow-up",
                "Close more with less effort",
              ].map((t, i) => (
                <motion.li
                  key={t}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 text-base"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20">
                    <Check className="h-3.5 w-3.5 text-emerald-300" strokeWidth={3} />
                  </span>
                  <span className="text-white/90">{t}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* RIGHT — login card */}
        <div className="flex-1 lg:w-2/5 flex items-center justify-center px-4 py-10">
          <motion.div
            animate={cardCtl}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[480px] rounded-2xl bg-white p-8 sm:p-10 shadow-2xl"
          >
            {/* Logo / header */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-white shadow-lg">
                <Sparkles className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div className="mt-3 text-base font-extrabold tracking-tight text-slate-900">Learniby</div>
              <h2 className="mt-5 text-2xl font-extrabold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Sign in to your sales workspace</p>
            </div>

            {/* Error banner */}
            {bannerErr && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="font-semibold">{bannerErr}</span>
              </motion.div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailErr(validateEmail(email))}
                  className="mt-1.5 h-11 rounded-xl border-slate-200 text-base text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="you@learniby.com"
                />
                {emailErr && <p className="mt-1 text-xs font-semibold text-rose-600">{emailErr}</p>}
              </div>

              <div>
                <Label htmlFor="pwd" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </Label>
                <div className="mt-1.5 relative">
                  <Input
                    id="pwd"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPwdErr(!password ? "Password is required" : null)}
                    className="h-11 pr-11 rounded-xl border-slate-200 text-base text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label={showPwd ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pwdErr && <p className="mt-1 text-xs font-semibold text-rose-600">{pwdErr}</p>}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                <label htmlFor="remember" className="text-sm font-semibold text-slate-600 select-none cursor-pointer">
                  Remember me for 30 days
                </label>
              </div>

              <Button
                type="submit"
                disabled={submitting || success}
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-base font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                {success ? (
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Signed in
                  </span>
                ) : submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </span>
                ) : (
                  "Login"
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline underline-offset-4"
                  onClick={() => alert("Forgot Password flow coming soon — contact admin.")}
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
