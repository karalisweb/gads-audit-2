import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAccount, getLatestRun } from '@/api/audit';
import type { GoogleAdsAccount, ImportRun } from '@/types/audit';
import { cn } from '@/lib/utils';
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
  ClipboardList,
  FileDown,
} from 'lucide-react';

const navItems = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: 'issues', label: 'Problemi', icon: AlertTriangle },
  { path: 'campaigns', label: 'Campagne', icon: Megaphone },
  { path: 'ad-groups', label: 'Ad Groups', icon: Layers },
  { path: 'ads', label: 'Annunci', icon: FileText },
  { path: 'keywords', label: 'Keywords', icon: KeyRound },
  { path: 'search-terms', label: 'Search Terms', icon: Search },
  { path: 'negative-keywords', label: 'Negative KW', icon: MinusCircle },
  { path: 'assets', label: 'Assets', icon: Image },
  { path: 'decisions', label: 'Decisioni', icon: ClipboardList },
  { path: 'export', label: 'Export', icon: FileDown },
];

export function AuditLayout() {
  const { accountId } = useParams<{ accountId: string }>();
  const [account, setAccount] = useState<GoogleAdsAccount | null>(null);
  const [latestRun, setLatestRun] = useState<ImportRun | null>(null);

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
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {account?.customerName || 'Loading...'}
              </h1>
              <p className="text-sm text-muted-foreground">
                ID: {account?.customerId}
                {latestRun && (
                  <span className="ml-4">
                    Dati: {new Date(latestRun.completedAt!).toLocaleDateString('it-IT')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="px-6">
          <div className="flex gap-1 overflow-x-auto pb-px -mb-px">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="p-6">
        <Outlet context={{ account, latestRun }} />
      </main>
    </div>
  );
}
