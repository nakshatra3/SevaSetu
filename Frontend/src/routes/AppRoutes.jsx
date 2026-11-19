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

import OpportunitiesPage from "@/features/opportunities/OpportunitiesPage";
import OpportunityDetailsPage from "@/features/opportunities/OpportunityDetailsPage";
import PostOpportunityForm from "@/features/opportunities/PostOpportunityForm";
import MyEventsPage from "@/features/opportunities/MyEventsPage";
import ManageEventPage from "@/features/opportunities/ManageEventPage";
import CheckInPage from "@/features/attendance/CheckInPage";

import VolunteerDashboardPage from "@/features/volunteers/VolunteerDashboardPage";
import VolunteerProfilePage from "@/features/volunteers/VolunteerProfilePage";
import MyActivitiesPage from "@/features/volunteers/MyActivitiesPage";
import RecommendationsPage from "@/features/recommendations/RecommendationsPage";

import OrganizationDashboardPage from "@/features/organizations/OrganizationDashboardPage";
import OrganizationProfilePage from "@/features/organizations/OrganizationProfilePage";

import DonationsPage from "@/features/donations/DonationsPage";
import LeaderboardsPage from "@/features/gamification/LeaderboardsPage";
import BadgesPage from "@/features/gamification/BadgesPage";
import NotificationsPage from "@/features/notifications/NotificationsPage";

import AdminDashboardPage from "@/features/admin/AdminDashboardPage";
import AdminUsersPage from "@/features/admin/AdminUsersPage";
import AdminOrganizationsPage from "@/features/admin/AdminOrganizationsPage";
import AdminReportsPage from "@/features/admin/AdminReportsPage";
import AdminEventsPage from "@/features/admin/AdminEventsPage";
import AdminCategoriesPage from "@/features/admin/AdminCategoriesPage";
import AdminBadgesPage from "@/features/admin/AdminBadgesPage";

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

          {/* Any logged-in user */}
          <Route path="opportunities" element={<OpportunitiesPage />} />
          <Route path="opportunities/:id" element={<OpportunityDetailsPage />} />
          <Route path="volunteers/:id" element={<VolunteerProfilePage />} />
          <Route path="organizations/:id" element={<OrganizationProfilePage />} />
          <Route path="leaderboards" element={<LeaderboardsPage />} />
          <Route path="badges" element={<BadgesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          <Route element={<ProtectedRoute roles={[ROLES.VOLUNTEER]} />}>
            <Route path="volunteer/dashboard" element={<VolunteerDashboardPage />} />
            <Route path="volunteer/profile" element={<VolunteerProfilePage />} />
            <Route path="volunteer/activities" element={<MyActivitiesPage />} />
            <Route path="recommendations" element={<RecommendationsPage />} />
            <Route path="checkin" element={<CheckInPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.VOLUNTEER, ROLES.ORGANIZATION]} />}>
            <Route path="donations" element={<DonationsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.ORGANIZATION]} />}>
            <Route path="organization/dashboard" element={<OrganizationDashboardPage />} />
            <Route path="organization/profile" element={<OrganizationProfilePage />} />
            <Route path="organization/events" element={<MyEventsPage />} />
            <Route path="organization/events/new" element={<PostOpportunityForm />} />
            <Route path="organization/events/:id/edit" element={<PostOpportunityForm />} />
            <Route path="organization/events/:id/manage" element={<ManageEventPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
            <Route path="admin/organizations" element={<AdminOrganizationsPage />} />
            <Route path="admin/events" element={<AdminEventsPage />} />
            <Route path="admin/reports" element={<AdminReportsPage />} />
            <Route path="admin/categories" element={<AdminCategoriesPage />} />
            <Route path="admin/badges" element={<AdminBadgesPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
