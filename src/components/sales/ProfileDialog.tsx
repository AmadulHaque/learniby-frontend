import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Lock, User as UserIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import { sales } from "@/lib/api";

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { salesUser, refresh } = useSalesAuth();
  const [tab, setTab] = useState<"profile" | "password">("profile");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (open && salesUser) {
      setFullName(salesUser.full_name || "");
      setPhone(salesUser.phone || "");
      setDesignation(salesUser.designation || "");
      setAvatarUrl(salesUser.avatar_url || null);
      setTab("profile");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
  }, [open, salesUser]);

  if (!salesUser) return null;

  const handleAvatarPick = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("শুধু image ফাইল আপলোড করুন");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Avatar 3MB-এর কম হতে হবে");
      return;
    }
    setUploading(true);
    try {
      const updated = await sales.auth.uploadAvatar(file);
      setAvatarUrl(updated.avatar_url);
      await refresh();
      toast.success("ছবি আপলোড হয়েছে");
    } catch (e: any) {
      toast.error(e.message || "Avatar upload ব্যর্থ");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      await sales.auth.removeAvatar();
      setAvatarUrl(null);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Avatar remove ব্যর্থ");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      toast.error("Full name দিন");
      return;
    }
    setSaving(true);
    try {
      await sales.auth.updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        designation: designation.trim() || null,
      });
      await refresh();
      toast.success("প্রোফাইল আপডেট হয়েছে");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Update ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPw.length < 8) {
      toast.error("নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষর");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Confirm password মিলছে না");
      return;
    }
    setPwSaving(true);
    try {
      await sales.auth.updatePassword({
        current_password: currentPw,
        password: newPw,
        password_confirmation: confirmPw,
      });
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      onOpenChange(false);
    } catch (e: any) {
      const msg = e?.body?.errors?.current_password?.[0] || e?.message;
      toast.error(msg || "Password change ব্যর্থ");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        {/* Hero header */}
        <div
          className="relative px-6 pt-6 pb-16 text-white"
          style={{
            background:
              "linear-gradient(135deg, #1E40AF 0%, #6D28D9 55%, #BE185D 100%)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">My Profile</DialogTitle>
            <DialogDescription className="text-white/80">
              আপনার তথ্য ও পাসওয়ার্ড পরিবর্তন করুন
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Avatar overlapping */}
        <div className="-mt-12 flex flex-col items-center px-6">
          <div className="relative">
            <div
              className="rounded-full p-[3px]"
              style={{
                background:
                  "conic-gradient(from 140deg, #f472b6, #818cf8, #38bdf8, #f472b6)",
              }}
            >
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-card text-2xl font-extrabold">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  <span>{fullName.charAt(0).toUpperCase() || "U"}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-card transition hover:scale-105 disabled:opacity-60"
              title="Upload photo"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow ring-2 ring-card transition hover:scale-110 disabled:opacity-60"
                title="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarPick(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="mt-3 text-sm font-bold">{fullName || "—"}</div>
          <div className="text-xs text-muted-foreground">{salesUser.email}</div>
          <div className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {salesUser.role === "admin" ? "Admin" : "Executive"}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setTab("profile")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition ${
                tab === "profile"
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserIcon className="h-3.5 w-3.5" /> Profile
            </button>
            <button
              onClick={() => setTab("password")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition ${
                tab === "password"
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="h-3.5 w-3.5" /> Password
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {tab === "profile" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pf-name">Full name</Label>
                <Input id="pf-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-desig">Designation</Label>
                <Input
                  id="pf-desig"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Sales Executive"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-phone">Phone</Label>
                <Input
                  id="pf-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+8801xxxxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={salesUser.email} disabled />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pw-cur">Current password</Label>
                <Input
                  id="pw-cur"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">New password</Label>
                <Input
                  id="pw-new"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-conf">Confirm new password</Label>
                <Input
                  id="pw-conf"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                কমপক্ষে ৮ অক্ষর। বর্তমান পাসওয়ার্ড verify করার পরে পরিবর্তন হবে।
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pwSaving}>
                  Cancel
                </Button>
                <Button onClick={handleChangePassword} disabled={pwSaving || !currentPw || !newPw || !confirmPw}>
                  {pwSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change password
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
