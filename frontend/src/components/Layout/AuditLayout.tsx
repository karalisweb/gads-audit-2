import { NavLink, Outlet, useParams, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAccount, getLatestRun } from '@/api/audit';
import type { GoogleAdsAccount, ImportRun } from '@/types/audit';
import { cn } from '@/lib/utils';
import { PeriodSelector } from '@/components/period';
import { MobileBottomNav } from './MobileBottomNav';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useNavigate } from 'react-router-dom';
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
  User,
  Bell,
  ArrowLeft,
  Menu,
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

// Mappa dei titoli per le pagine
const pageTitles: Record<string, string> = {
  'dashboard': 'Dashboard',
  'issues': 'Problemi',
  'conversions': 'Conversioni',
  'conversion-actions': 'Config Conv.',
  'campaigns': 'Campagne',
  'ad-groups': 'Ad Groups',
  'ads': 'Annunci',
  'keywords': 'Keywords',
  'search-terms': 'Search Terms',
  'negative-keywords': 'Negative KW',
  'assets': 'Assets',
  'modifications': 'Modifiche',
};

export function AuditLayout() {
  const { accountId } = useParams<{ accountId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toggleSidebar } = useUIStore();
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

  // Ottieni il titolo della pagina corrente
  const getCurrentPageTitle = () => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    return pageTitles[lastSegment] || 'Audit';
  };

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Sidebar overlay */}
      <Sidebar />

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Hamburger + Back + titolo */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={toggleSidebar}
              className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/accounts')}
              className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Torna agli account"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-foreground truncate">
                {getCurrentPageTitle()}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {account?.customerName || 'Loading...'}
              </p>
            </div>
          </div>

          {/* Azioni a destra */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Notifiche"
            >
              <Bell className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                'bg-primary/10 text-primary hover:bg-primary/20'
              )}
              title={user?.email || 'Profilo'}
            >
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Period Selector su mobile */}
        <div className="px-4 pb-3">
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            lastAuditDate={latestRun?.completedAt || null}
          />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-10 bg-card border-b border-border">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger menu */}
              <button
                onClick={toggleSidebar}
                className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                title="Menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {account?.customerName || 'Loading...'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  ID: {account?.customerId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PeriodSelector
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                lastAuditDate={latestRun?.completedAt || null}
              />
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                title="Torna alla Home"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - solo desktop */}
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

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant="audit" />
    </div>
  );
}
