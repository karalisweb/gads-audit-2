import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAccount, getLatestRun } from '@/api/audit';
import type { GoogleAdsAccount, ImportRun } from '@/types/audit';
import { cn } from '@/lib/utils';
import { PeriodSelector } from '@/components/period';
import {
  LayoutDashboard,
  AlertTriangle,
  Megaphone,
  Layers,
  FileText,
  Search,
  KeyRound,
  MinusCircle,
  Image,
  Target,
  Settings,
  Wrench,
} from 'lucide-react';

const navItems = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: 'issues', label: 'Problemi', icon: AlertTriangle },
  { path: 'conversions', label: 'Conversioni', icon: Target },
  { path: 'conversion-actions', label: 'Config Conv.', icon: Settings },
  { path: 'campaigns', label: 'Campagne', icon: Megaphone },
  { path: 'ad-groups', label: 'Ad Groups', icon: Layers },
  { path: 'ads', label: 'Annunci', icon: FileText },
  { path: 'keywords', label: 'Keywords', icon: KeyRound },
  { path: 'search-terms', label: 'Search Terms', icon: Search },
  { path: 'negative-keywords', label: 'Negative KW', icon: MinusCircle },
  { path: 'assets', label: 'Assets', icon: Image },
  { path: 'modifications', label: 'Modifiche', icon: Wrench },
];

export function AuditLayout() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<GoogleAdsAccount | null>(null);
  const [latestRun, setLatestRun] = useState<ImportRun | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<15 | 30>(30);

  useEffect(() => {
    if (!accountId) return;

    Promise.all([getAccount(accountId), getLatestRun(accountId)])
      .then(([acc, run]) => {
        setAccount(acc);
        setLatestRun(run);
      })
      .catch((err) => {
        console.error('Failed to load account:', err);
      });
  }, [accountId]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                {account?.customerName || 'Loading...'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                ID: {account?.customerId}
              </p>
            </div>
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              lastAuditDate={latestRun?.completedAt || null}
            />
          </div>
        </div>

        {/* Tab Navigation - scrollabile su mobile */}
        <nav className="px-2 sm:px-6">
          <div className="flex gap-0.5 sm:gap-1 overflow-x-auto pb-px -mb-px scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline sm:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="p-3 sm:p-6">
        <Outlet context={{ account, latestRun, selectedPeriod }} />
      </main>
    </div>
  );
}
