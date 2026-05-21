import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { BookOpen, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/dashboard/manager/courses")({
  component: ManagerCourses,
});

function ManagerCourses() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">কোর্স ম্যানেজমেন্ট</h1>
        <p className="text-sm text-slate-500">কোর্স, মডিউল ও ভিডিও যোগ/সম্পাদনা করুন।</p>
      </div>
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: "#F7F1FB" }}>
            <BookOpen className="h-6 w-6" style={{ color: "#7B1CB8" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-700">
              কোর্স ম্যানেজমেন্ট টুল ব্যবহার করতে অ্যাডমিন প্যানেলের কোর্স সেকশনে যান। ম্যানেজাররাও সম্পূর্ণ অ্যাক্সেস পাবেন।
            </p>
            <Link
              to={"/dashboard/admin/courses" as any}
              className="mt-3 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "#7B1CB8" }}
            >
              কোর্স টুল ওপেন করুন <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
