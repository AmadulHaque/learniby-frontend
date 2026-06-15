import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

import { Route as HomeRoute } from "@/routes/index";
import { Route as AboutRoute } from "@/routes/about-us";
import { Route as AllCoursesRoute } from "@/routes/all-courses";
import { Route as BlogRoute } from "@/routes/blog";
import { Route as ContactRoute } from "@/routes/contact-us";

import { Route as DashboardRoute } from "@/routes/dashboard.index";
import { Route as DashboardLoginRoute } from "@/routes/dashboard.login";
import { Route as DashboardRegisterRoute } from "@/routes/dashboard.register";
import { Route as DashboardForgotPasswordRoute } from "@/routes/dashboard.forgot-password";
import { Route as DashboardResetPasswordRoute } from "@/routes/dashboard.reset-password";
import { Route as DashboardProfileRoute } from "@/routes/dashboard.profile";
import { Route as DashboardMyCourseRoute } from "@/routes/dashboard.my-course";
import { Route as DashboardBillingRoute } from "@/routes/dashboard.billing";
import { Route as DashboardCertificateRoute } from "@/routes/dashboard.certificate";
import { Route as DashboardEbookRoute } from "@/routes/dashboard.ebook";
import { Route as DashboardLiveClassRoute } from "@/routes/dashboard.live-class";
import { Route as DashboardCourseRoute } from "@/routes/dashboard.course.$courseId";
import { Route as DashboardCourseVideoRoute } from "@/routes/dashboard.course.$courseId.video.$videoId";

import { Route as AdminLayoutRoute } from "@/routes/dashboard.admin";
import { Route as AdminIndexRoute } from "@/routes/dashboard.admin.index";
import { Route as AdminPendingRoute } from "@/routes/dashboard.admin.pending";
import { Route as AdminStudentsRoute } from "@/routes/dashboard.admin.students";
import { Route as AdminTeachersRoute } from "@/routes/dashboard.admin.teachers";
import { Route as AdminCoursesRoute } from "@/routes/dashboard.admin.courses";
import { Route as AdminSessionsRoute } from "@/routes/dashboard.admin.sessions";
import { Route as AdminStudentRoute } from "@/routes/dashboard.admin.student.$userId";
import { Route as AdminCourseRoute } from "@/routes/dashboard.admin.course.$courseId";

import { Route as ManagerLayoutRoute } from "@/routes/dashboard.manager";
import { Route as ManagerIndexRoute } from "@/routes/dashboard.manager.index";
import { Route as ManagerStudentsRoute } from "@/routes/dashboard.manager.students";
import { Route as ManagerBatchesRoute } from "@/routes/dashboard.manager.batches";
import { Route as ManagerCoursesRoute } from "@/routes/dashboard.manager.courses";
import { Route as ManagerSessionsRoute } from "@/routes/dashboard.manager.sessions";

import { Route as TeacherLayoutRoute } from "@/routes/dashboard.teacher";
import { Route as TeacherIndexRoute } from "@/routes/dashboard.teacher.index";
import { Route as TeacherSessionsRoute } from "@/routes/dashboard.teacher.sessions";

import { Route as SalesLayoutRoute } from "@/routes/sales";
import { Route as SalesIndexRoute } from "@/routes/sales.index";
import { Route as SalesLoginRoute } from "@/routes/sales.login";
import { Route as SalesLeadsRoute } from "@/routes/sales.leads";
import { Route as SalesLeadRoute } from "@/routes/sales.leads.$id";
import { Route as SalesCoursesRoute } from "@/routes/sales.courses";
import { Route as SalesReportsRoute } from "@/routes/sales.reports";
import { Route as SalesExpensesRoute } from "@/routes/sales.expenses";
import { Route as SalesAccountingRoute } from "@/routes/sales.accounting";
import { Route as SalesSettingsRoute } from "@/routes/sales.settings";

const component = (route: { component?: React.ComponentType }) => {
  const Component = route.component;
  return Component ? <Component /> : <Outlet />;
};

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={component(HomeRoute)} />
        <Route path="/about-us" element={component(AboutRoute)} />
        <Route path="/all-courses" element={component(AllCoursesRoute)} />
        <Route path="/blog" element={component(BlogRoute)} />
        <Route path="/contact-us" element={component(ContactRoute)} />

        <Route path="/dashboard" element={component(DashboardRoute)} />
        <Route path="/dashboard/login" element={component(DashboardLoginRoute)} />
        <Route path="/dashboard/register" element={component(DashboardRegisterRoute)} />
        <Route
          path="/dashboard/forgot-password"
          element={component(DashboardForgotPasswordRoute)}
        />
        <Route path="/dashboard/reset-password" element={component(DashboardResetPasswordRoute)} />
        <Route path="/dashboard/profile" element={component(DashboardProfileRoute)} />
        <Route path="/dashboard/my-course" element={component(DashboardMyCourseRoute)} />
        <Route path="/dashboard/billing" element={component(DashboardBillingRoute)} />
        <Route path="/dashboard/certificate" element={component(DashboardCertificateRoute)} />
        <Route path="/dashboard/ebook" element={component(DashboardEbookRoute)} />
        <Route path="/dashboard/live-class" element={component(DashboardLiveClassRoute)} />
        <Route path="/dashboard/course/:courseId" element={component(DashboardCourseRoute)} />
        <Route
          path="/dashboard/course/:courseId/video/:videoId"
          element={component(DashboardCourseVideoRoute)}
        />

        <Route path="/dashboard/admin" element={component(AdminLayoutRoute)}>
          <Route index element={component(AdminIndexRoute)} />
          <Route path="pending" element={component(AdminPendingRoute)} />
          <Route path="students" element={component(AdminStudentsRoute)} />
          <Route path="teachers" element={component(AdminTeachersRoute)} />
          <Route path="courses" element={component(AdminCoursesRoute)} />
          <Route path="sessions" element={component(AdminSessionsRoute)} />
          <Route path="student/:userId" element={component(AdminStudentRoute)} />
          <Route path="course/:courseId" element={component(AdminCourseRoute)} />
        </Route>

        <Route path="/dashboard/manager" element={component(ManagerLayoutRoute)}>
          <Route index element={component(ManagerIndexRoute)} />
          <Route path="students" element={component(ManagerStudentsRoute)} />
          <Route path="batches" element={component(ManagerBatchesRoute)} />
          <Route path="courses" element={component(ManagerCoursesRoute)} />
          <Route path="sessions" element={component(ManagerSessionsRoute)} />
        </Route>

        <Route path="/dashboard/teacher" element={component(TeacherLayoutRoute)}>
          <Route index element={component(TeacherIndexRoute)} />
          <Route path="sessions" element={component(TeacherSessionsRoute)} />
        </Route>

        <Route path="/sales" element={component(SalesLayoutRoute)}>
          <Route index element={component(SalesIndexRoute)} />
          <Route path="login" element={component(SalesLoginRoute)} />
          <Route path="leads" element={component(SalesLeadsRoute)} />
          <Route path="leads/:id" element={component(SalesLeadRoute)} />
          <Route path="courses" element={component(SalesCoursesRoute)} />
          <Route path="reports" element={component(SalesReportsRoute)} />
          <Route path="expenses" element={component(SalesExpensesRoute)} />
          <Route path="accounting" element={component(SalesAccountingRoute)} />
          <Route path="settings" element={component(SalesSettingsRoute)} />
        </Route>

        <Route
          path="/reset-password"
          element={<Navigate to="/dashboard/reset-password" replace />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">পেজ পাওয়া যায়নি</h2>
        <p className="mt-2 text-sm text-muted-foreground">আপনি যে পেজটি খুঁজছেন সেটি নেই।</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            হোমে ফিরে যান
          </Link>
        </div>
      </div>
    </div>
  );
}
