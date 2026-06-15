import { Link, useLocation } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, Moon, Shield, Sun, User as UserIcon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import logo from "@/assets/learniby-logo.webp";

export function AppHeader() {
  const { user, role, signOut } = useAuth();
  const loc = useLocation();
  const { theme, toggle } = useTheme();
  const isAdminArea = loc.pathname.startsWith("/dashboard/admin");

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2 transition-transform hover:scale-[1.03]" aria-label="Learniby course portal home">
          <img src={logo} alt="Learniby learning portal logo" className="h-9 w-auto sm:h-10" />
        </Link>

        <nav className="flex items-center gap-1">
          {role === "admin" && (
            <Link to={isAdminArea ? "/dashboard" : "/dashboard/admin"}>
              <Button
                variant={isAdminArea ? "outline" : "default"}
                size="sm"
                className="gap-1.5 font-bold rounded-full"
              >
                {isAdminArea ? <LayoutDashboard className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                <span className="hidden sm:inline">{isAdminArea ? "স্টুডেন্ট ভিউ" : "অ্যাডমিন"}</span>
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={toggle} title={theme === "dark" ? "Light mode" : "Dark mode"} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} className="rounded-full">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link to="/dashboard/profile" aria-label="Open your profile">
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Open your profile">
              <UserIcon className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => signOut()} title="লগআউট" aria-label="Log out" className="rounded-full">
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
