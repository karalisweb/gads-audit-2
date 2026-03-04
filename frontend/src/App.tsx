import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastContainer } from '@/components/ToastContainer';
import { MainLayout, AuditLayout } from '@/components/Layout';
import { Skeleton } from '@/components/ui/skeleton';

// Auth pages (always loaded - entry point)
import { LoginPage, VerifyTwoFactorPage, AcceptInvitePage, ForgotPasswordPage, ResetPasswordPage } from '@/pages/auth';

/**
 * Wrapper around React.lazy that auto-reloads on chunk loading failures.
 * After a deploy, old chunk hashes become invalid. This detects the error
 * and triggers a page reload to fetch the new HTML with updated chunk refs.
 * Prevents infinite loops by tracking reloads in sessionStorage (max 1/min per path).
 */
function lazyWithRetry<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T } | { [key: string]: T }>,
  resolver?: (m: Record<string, T>) => T,
) {
  return lazy(() =>
    (resolver
      ? factory().then(m => ({ default: resolver(m as Record<string, T>) }))
      : factory() as Promise<{ default: T }>
    ).catch((error: Error) => {
      const msg = error?.message || '';
      const isChunkError =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Importing a module script failed') ||
        msg.includes('Loading chunk') ||
        msg.includes('Loading CSS chunk');

      if (isChunkError) {
        const reloadKey = 'chunk_reload_' + window.location.pathname;
        const lastReload = sessionStorage.getItem(reloadKey);
        const now = Date.now();

        if (!lastReload || now - parseInt(lastReload) > 60000) {
          sessionStorage.setItem(reloadKey, String(now));
          window.location.reload();
          // Return a never-resolving promise to prevent React from rendering error state
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }),
  );
}

// Lazy loaded pages with auto-reload on chunk failure
const DashboardPage = lazyWithRetry(() => import('@/pages/dashboard/DashboardPage'), m => m.DashboardPage);
const AccountsPage = lazyWithRetry(() => import('@/pages/accounts/AccountsPage'), m => m.AccountsPage);
const ProfilePage = lazyWithRetry(() => import('@/pages/profile/ProfilePage'), m => m.ProfilePage);
const SettingsPage = lazyWithRetry(() => import('@/pages/settings/SettingsPage'), m => m.SettingsPage);
const AdminUsersPage = lazyWithRetry(() => import('@/pages/admin/AdminUsersPage'), m => m.AdminUsersPage);
const NotFoundPage = lazyWithRetry(() => import('@/pages/NotFoundPage'), m => m.NotFoundPage);

// Audit pages (lazy with auto-reload)
const AuditDashboardPage = lazyWithRetry(() => import('@/pages/audit/DashboardPage'), m => m.DashboardPage);
const CampaignsPage = lazyWithRetry(() => import('@/pages/audit/CampaignsPage'), m => m.CampaignsPage);
const AdGroupsPage = lazyWithRetry(() => import('@/pages/audit/AdGroupsPage'), m => m.AdGroupsPage);
const AdsPage = lazyWithRetry(() => import('@/pages/audit/AdsPage'), m => m.AdsPage);
const KeywordsPage = lazyWithRetry(() => import('@/pages/audit/KeywordsPage'), m => m.KeywordsPage);
const SearchTermsPage = lazyWithRetry(() => import('@/pages/audit/SearchTermsPage'), m => m.SearchTermsPage);
const NegativeKeywordsPage = lazyWithRetry(() => import('@/pages/audit/NegativeKeywordsPage'), m => m.NegativeKeywordsPage);
const AssetsPage = lazyWithRetry(() => import('@/pages/audit/AssetsPage'), m => m.AssetsPage);
const AuditReportPage = lazyWithRetry(() => import('@/pages/audit/AuditReportPage'), m => m.AuditReportPage);
const ConversionsPage = lazyWithRetry(() => import('@/pages/audit/ConversionsPage'), m => m.ConversionsPage);
const LandingPagesPage = lazyWithRetry(() => import('@/pages/audit/LandingPagesPage'), m => m.LandingPagesPage);
const LandingPagePlannerPage = lazyWithRetry(() => import('@/pages/audit/LandingPagePlannerPage'), m => m.LandingPagePlannerPage);
const LandingPageBriefPage = lazyWithRetry(() => import('@/pages/audit/LandingPageBriefPage'), m => m.LandingPageBriefPage);
const ModificationsPage = lazyWithRetry(() => import('@/pages/modifications/ModificationsPage'), m => m.ModificationsPage);

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
                <Route path="lp-planner" element={<LandingPagePlannerPage />} />
                <Route path="lp-planner/:briefId" element={<LandingPageBriefPage />} />
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
