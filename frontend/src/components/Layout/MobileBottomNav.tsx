import { NavLink, useParams, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  User,
  Megaphone,
  Layers,
  KeyRound,
  Target,
  AlertTriangle,
  FileText,
  Search,
  MinusCircle,
  Image,
  Wrench,
  Settings,
  MoreHorizontal,
  X,
} from 'lucide-react';

// Menu principale per la navigazione globale
const mainNavItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/accounts', label: 'Account', icon: Building2 },
  { path: '/profile', label: 'Profilo', icon: User },
];

// Menu per le pagine audit
const auditNavItems = [
  { path: 'campaigns', label: 'Camp.', icon: Megaphone },
  { path: 'ad-groups', label: 'Groups', icon: Layers },
  { path: 'keywords', label: 'KW', icon: KeyRound },
  { path: 'conversions', label: 'Conv.', icon: Target },
];

const auditSecondaryItems = [
  { path: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { path: 'issues', label: 'Issues', icon: AlertTriangle },
  { path: 'ads', label: 'Ads', icon: FileText },
  { path: 'search-terms', label: 'Search', icon: Search },
  { path: 'negative-keywords', label: 'Neg.', icon: MinusCircle },
  { path: 'assets', label: 'Assets', icon: Image },
  { path: 'conversion-actions', label: 'Config', icon: Settings },
  { path: 'modifications', label: 'Mod.', icon: Wrench },
];

interface MobileBottomNavProps {
  variant?: 'main' | 'audit';
}

export function MobileBottomNav({ variant = 'main' }: MobileBottomNavProps) {
  const { accountId } = useParams<{ accountId: string }>();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Determina automaticamente la variante dalla URL
  const isAuditPage = location.pathname.includes('/audit/');
  const effectiveVariant = isAuditPage ? 'audit' : variant;

  if (effectiveVariant === 'audit') {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-stretch justify-around">
          {auditNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/audit/${accountId}/${item.path}`}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center py-2 px-2 flex-1 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )
                }
              >
                <Icon className="h-5 w-5 mb-0.5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={cn(
              'flex flex-col items-center justify-center py-2 px-2 flex-1 transition-colors',
              moreMenuOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {moreMenuOpen ? (
              <X className="h-5 w-5 mb-0.5" />
            ) : (
              <MoreHorizontal className="h-5 w-5 mb-0.5" />
            )}
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>

        {/* More menu overlay */}
        {moreMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 -z-10"
              onClick={() => setMoreMenuOpen(false)}
            />
            <div className="absolute bottom-full left-0 right-0 bg-card border-t border-border shadow-lg">
              <div className="grid grid-cols-4 gap-1 p-3">
                {auditSecondaryItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.endsWith(`/${item.path}`);
                  return (
                    <NavLink
                      key={item.path}
                      to={`/audit/${accountId}/${item.path}`}
                      onClick={() => setMoreMenuOpen(false)}
                      className={cn(
                        'flex flex-col items-center justify-center py-3 px-2 rounded-lg transition-colors',
                        isActive
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-6 w-6 mb-1" />
                      <span className="text-[10px] font-medium text-center leading-tight">
                        {item.label}
                      </span>
                    </NavLink>
                  );
                })}
              </div>

              {/* Link per tornare agli account */}
              <div className="px-3 pb-3">
                <NavLink
                  to="/accounts"
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Torna agli Account</span>
                </NavLink>
              </div>
            </div>
          </>
        )}
      </nav>
    );
  }

  // Navigazione principale
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-stretch justify-around">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center py-2 px-4 flex-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
