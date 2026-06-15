import { useNavigate, useRouterState } from "@/lib/router-compat";
import { LogOut, PanelLeft, Settings as SettingsIcon, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import { NotificationBell } from "./NotificationBell";

const TITLES: Record<string, string> = {
  "/sales": "Dashboard",
  "/sales/leads": "All Leads",
  
  "/sales/reports": "Reports",
  "/sales/settings": "Settings",
};

export function SalesTopBar({
  onToggleSidebar,
  user = { name: "Demo User", avatar_url: null },
  onOpenProfile,
}: {
  onToggleSidebar: () => void;
  notificationCount?: number;
  user?: { name: string; avatar_url?: string | null };
  onOpenProfile?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = TITLES[pathname] ?? "Sales";
  const { signOut, salesUser } = useSalesAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate({ to: "/sales/login" });
    } catch (e) {
      toast.error("Failed to log out");
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hidden md:inline-flex h-9 w-9 rounded-lg"
          >
            <PanelLeft className="h-4.5 w-4.5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="User menu"
                className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full p-[2px] shadow-md transition hover:shadow-lg hover:-translate-y-0.5"
                style={{
                  background:
                    "conic-gradient(from 140deg, #f472b6, #818cf8, #38bdf8, #f472b6)",
                }}
              >
                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-card text-xs font-extrabold text-foreground">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-bold">{user.name}</span>
                  {salesUser?.email && (
                    <span className="text-xs font-normal text-muted-foreground truncate">
                      {salesUser.email}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onOpenProfile?.()}>
                <UserIcon className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/sales/settings" })}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-rose-600 focus:text-rose-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
