import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage, VerifyTwoFactorPage, AcceptInvitePage, ForgotPasswordPage, ResetPasswordPage } from '@/pages/auth';
import { DashboardPage } from '@/pages/dashboard';
import { AccountsPage } from '@/pages/accounts';
import { ProfilePage } from '@/pages/profile';
import { SettingsPage } from '@/pages/settings';
import { MainLayout, AuditLayout } from '@/components/Layout';
import {
  DashboardPage as AuditDashboardPage,
  CampaignsPage,
  AdGroupsPage,
  AdsPage,
  KeywordsPage,
  SearchTermsPage,
  NegativeKeywordsPage,
  AssetsPage,
  IssuesPage,
  ConversionsPage,
  ConversionActionsPage,
  LandingPagesPage,
} from '@/pages/audit';
import { ModificationsPage } from '@/pages/modifications';

function App() {
  return (
    <BrowserRouter>
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
          </Route>

          {/* Audit routes - fuori da MainLayout per evitare header duplicato */}
          <Route path="/audit/:accountId" element={<AuditLayout />}>
            <Route path="dashboard" element={<AuditDashboardPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="ad-groups" element={<AdGroupsPage />} />
            <Route path="ads" element={<AdsPage />} />
            <Route path="keywords" element={<KeywordsPage />} />
            <Route path="search-terms" element={<SearchTermsPage />} />
            <Route path="negative-keywords" element={<NegativeKeywordsPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="conversions" element={<ConversionsPage />} />
            <Route path="conversion-actions" element={<ConversionActionsPage />} />
            <Route path="landing-pages" element={<LandingPagesPage />} />
            <Route path="modifications" element={<ModificationsPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* Redirect root to dashboard or login */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
