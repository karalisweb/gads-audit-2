import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage, VerifyTwoFactorPage, SetupTwoFactorPage, AcceptInvitePage } from '@/pages/auth';
import { DashboardPage } from '@/pages/dashboard';
import { AccountsPage } from '@/pages/accounts';
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

        {/* Protected routes with sidebar */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/auth/setup-2fa" element={<SetupTwoFactorPage />} />
            <Route path="/accounts" element={<AccountsPage />} />

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
              <Route path="issues" element={<IssuesPage />} />
              <Route path="conversions" element={<ConversionsPage />} />
              <Route path="conversion-actions" element={<ConversionActionsPage />} />
              <Route path="modifications" element={<ModificationsPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>
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
