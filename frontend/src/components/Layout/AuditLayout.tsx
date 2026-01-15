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
  MoreHorizontal,
  X,
} from 'lucide-react';

const navItems = [
  { path: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { path: 'issues', label: 'Problemi', shortLabel: 'Issues', icon: AlertTriangle },
  { path: 'conversions', label: 'Conversioni', shortLabel: 'Conv.', icon: Target },
  { path: 'conversion-actions', label: 'Config Conv.', shortLabel: 'Config', icon: Settings },
  { path: 'campaigns', label: 'Campagne', shortLabel: 'Camp.', icon: Megaphone },
  { path: 'ad-groups', label: 'Ad Groups', shortLabel: 'Groups', icon: Layers },
  { path: 'ads', label: 'Annunci', shortLabel: 'Ads', icon: FileText },
  { path: 'keywords', label: 'Keywords', shortLabel: 'KW', icon: KeyRound },
  { path: 'search-terms', label: 'Search Terms', shortLabel: 'Search', icon: Search },
  { path: 'negative-keywords', label: 'Negative KW', shortLabel: 'Neg.', icon: MinusCircle },
  { path: 'assets', label: 'Assets', shortLabel: 'Assets', icon: Image },
  { path: 'modifications', label: 'Modifiche', shortLabel: 'Mod.', icon: Wrench },
];

// Voci principali per la bottom navigation mobile (max 4 + more)
const primaryNavItems = navItems.filter(item =>
  ['campaigns', 'keywords', 'search-terms', 'issues'].includes(item.path)
);
const secondaryNavItems = navItems.filter(item =>
  !['campaigns', 'keywords', 'search-terms', 'issues'].includes(item.path)
);

export function AuditLayout() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<GoogleAdsAccount | null>(null);
  const [latestRun, setLatestRun] = useState<ImportRun | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<15 | 30>(30);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

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
    <div className="min-h-screen pb-16 md:pb-0">
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

        {/* Tab Navigation - nascosta su mobile, visibile da md in su */}
        <nav className="hidden md:block px-2 sm:px-6">
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

      {/* Bottom Navigation - solo mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
        <div className="flex items-stretch justify-around">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center py-2 px-3 flex-1 transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )
                }
              >
                <Icon className="h-5 w-5 mb-0.5" />
                <span className="text-[10px] font-medium">{item.shortLabel}</span>
              </NavLink>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={cn(
              'flex flex-col items-center justify-center py-2 px-3 flex-1 transition-colors',
              moreMenuOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {moreMenuOpen ? (
              <X className="h-5 w-5 mb-0.5" />
            ) : (
              <MoreHorizontal className="h-5 w-5 mb-0.5" />
            )}
            <span className="text-[10px] font-medium">Altro</span>
          </button>
        </div>

        {/* More menu overlay */}
        {moreMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 -z-10"
              onClick={() => setMoreMenuOpen(false)}
            />
            {/* Menu */}
            <div className="absolute bottom-full left-0 right-0 bg-card border-t border-border shadow-lg max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-4 gap-1 p-3">
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-colors',
                          isActive
                            ? 'text-primary bg-primary/10'
                            : 'text-muted-foreground hover:bg-muted'
                        )
                      }
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-[10px] font-medium text-center leading-tight">
                        {item.shortLabel}
                      </span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>
    </div>
  );
}
