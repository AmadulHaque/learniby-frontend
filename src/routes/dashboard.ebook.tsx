import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { StudentShell } from "@/components/course/StudentShell";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/dashboard/ebook")({
  component: EbookPage,
  head: () => ({ meta: [{ title: "ই-বুক — Learniby" }] }),
});

function EbookPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/dashboard/login" />;

  return (
    <StudentShell>
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900">E-Book</h1>
        <p className="mt-1 text-sm text-slate-500">List of your purchased e-books</p>
        <div className="grid place-items-center py-24 text-center">
          <BookOpen className="h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">No books purchased yet</p>
        </div>
      </div>
    </StudentShell>
  );
}
