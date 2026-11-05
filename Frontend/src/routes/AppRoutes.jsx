import { Route, Routes } from "react-router-dom";
import { ROLES } from "@/config/constants";
import { GuestRoute, ProtectedRoute, RoleHomeRedirect } from "./guards";

import PublicLayout from "@/layouts/PublicLayout";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";

import HomePage from "@/pages/HomePage";
import NotFoundPage from "@/pages/NotFoundPage";
import ForbiddenPage from "@/pages/ForbiddenPage";

import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import VolunteerProfilePage from "@/features/volunteers/VolunteerProfilePage";
import OrganizationProfilePage from "@/features/organizations/OrganizationProfilePage";
import NotificationsPage from "@/features/notifications/NotificationsPage";
import AdminDashboardPage from "@/features/admin/AdminDashboardPage";
import AdminUsersPage from "@/features/admin/AdminUsersPage";
import AdminOrganizationsPage from "@/features/admin/AdminOrganizationsPage";
import AdminReportsPage from "@/features/admin/AdminReportsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="app" element={<DashboardLayout />}>
          <Route index element={<RoleHomeRedirect />} />
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Read-only profiles, visible to any logged-in user */}
          <Route path="volunteers/:id" element={<VolunteerProfilePage />} />
          <Route path="organizations/:id" element={<OrganizationProfilePage />} />

          <Route element={<ProtectedRoute roles={[ROLES.VOLUNTEER]} />}>
            <Route path="volunteer/profile" element={<VolunteerProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.ORGANIZATION]} />}>
            <Route path="organization/profile" element={<OrganizationProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/organizations" element={<AdminOrganizationsPage />} />
            <Route path="admin/reports" element={<AdminReportsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
