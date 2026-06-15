import { defineRoute, Navigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { StudentShell } from "@/components/course/StudentShell";
import { FileText } from "lucide-react";

export const Route = defineRoute("/dashboard/certificate")({
  component: CertificatePage,
  head: () => ({ meta: [{ title: "সার্টিফিকেট — Learniby" }] }),
});

function CertificatePage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/dashboard/login" />;

  return (
    <StudentShell>
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="bg-[#7B1CB8] px-5 py-4 text-white">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <FileText className="h-5 w-5" /> My Certificates (0)
            </h2>
          </div>
          <div className="grid place-items-center px-5 py-16 text-center text-slate-500">
            <FileText className="h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm">No certificates available.</p>
          </div>
        </div>
        <div className="grid place-items-center rounded-2xl bg-white p-12 text-center shadow-sm">
          <FileText className="h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-bold text-slate-900">Select a Certificate</h3>
          <p className="mt-1 text-sm text-slate-500">
            Choose a certificate from the list to view details and download options
          </p>
        </div>
      </div>
    </StudentShell>
  );
}
