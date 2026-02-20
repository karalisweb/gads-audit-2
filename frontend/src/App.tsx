import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/ToastContainer';
import { MainLayout, AuditLayout } from '@/components/Layout';
import { Skeleton } from '@/components/ui/skeleton';

// Auth pages (always loaded - entry point)
import { LoginPage, VerifyTwoFactorPage, AcceptInvitePage, ForgotPasswordPage, ResetPasswordPage } from '@/pages/auth';

// Lazy loaded pages
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AccountsPage = lazy(() => import('@/pages/accounts/AccountsPage').then(m => ({ default: m.AccountsPage })));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Audit pages (lazy)
const AuditDashboardPage = lazy(() => import('@/pages/audit/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CampaignsPage = lazy(() => import('@/pages/audit/CampaignsPage').then(m => ({ default: m.CampaignsPage })));
const AdGroupsPage = lazy(() => import('@/pages/audit/AdGroupsPage').then(m => ({ default: m.AdGroupsPage })));
const AdsPage = lazy(() => import('@/pages/audit/AdsPage').then(m => ({ default: m.AdsPage })));
const KeywordsPage = lazy(() => import('@/pages/audit/KeywordsPage').then(m => ({ default: m.KeywordsPage })));
const SearchTermsPage = lazy(() => import('@/pages/audit/SearchTermsPage').then(m => ({ default: m.SearchTermsPage })));
const NegativeKeywordsPage = lazy(() => import('@/pages/audit/NegativeKeywordsPage').then(m => ({ default: m.NegativeKeywordsPage })));
const AssetsPage = lazy(() => import('@/pages/audit/AssetsPage').then(m => ({ default: m.AssetsPage })));
const AuditReportPage = lazy(() => import('@/pages/audit/AuditReportPage').then(m => ({ default: m.AuditReportPage })));
const ConversionsPage = lazy(() => import('@/pages/audit/ConversionsPage').then(m => ({ default: m.ConversionsPage })));
const LandingPagesPage = lazy(() => import('@/pages/audit/LandingPagesPage').then(m => ({ default: m.LandingPagesPage })));
const ModificationsPage = lazy(() => import('@/pages/modifications/ModificationsPage').then(m => ({ default: m.ModificationsPage })));

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/verify-2fa" element={<VerifyTwoFactorPage />} />
            <Route path="/auth/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes with sidebar */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
              </Route>

              {/* Audit routes */}
              <Route path="/audit/:accountId" element={<AuditLayout />}>
                <Route path="dashboard" element={<AuditDashboardPage />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                <Route path="ad-groups" element={<AdGroupsPage />} />
                <Route path="ads" element={<AdsPage />} />
                <Route path="keywords" element={<KeywordsPage />} />
                <Route path="search-terms" element={<SearchTermsPage />} />
                <Route path="negative-keywords" element={<NegativeKeywordsPage />} />
                <Route path="assets" element={<AssetsPage />} />
                <Route path="report" element={<AuditReportPage />} />
                <Route path="conversions" element={<ConversionsPage />} />
                <Route path="landing-pages" element={<LandingPagesPage />} />
                <Route path="modifications" element={<ModificationsPage />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Route>
            </Route>

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
