import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useNotificationsStore } from '@/stores/notifications.store';
import {
  LayoutDashboard,
  Building2,
  LogOut,
  User,
  Users,
  Settings,
  BookOpen,
  X,
} from 'lucide-react';
import { GadsIcon } from '@/components/icons/GadsIcon';

const APP_VERSION = '2.9.0';

// Zona 2 - Navigazione Principale (base)
const baseNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Account', icon: Building2 },
];

// Zona 3 - Navigazione Fissa (footer)
const footerNavItems = [
  { path: '/profile', label: 'Profilo', icon: User },
  { path: '/settings', label: 'Impostazioni', icon: Settings },
];

interface SidebarProps {
  mode?: 'fixed' | 'overlay';
}

export function Sidebar({ mode = 'overlay' }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { pendingCount, fetchPendingCount } = useNotificationsStore();

  // Fetch pending count on mount and every 5 minutes
  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  const mainNavItems = baseNavItems;

  const dynamicFooterItems = [
    ...footerNavItems,
    ...(user?.role === 'admin' ? [{ path: '/admin/users', label: 'Utenti', icon: Users }] : []),
  ];

  const isFixed = mode === 'fixed';

  const handleLogout = async () => {
    if (!isFixed || sidebarCollapsed) toggleSidebar();
    await logout();
    navigate('/auth/login');
  };

  const handleNavClick = () => {
    // In fixed mode on desktop, don't close sidebar on nav click
    // On mobile (overlay behavior), always close
    if (!isFixed) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Overlay scuro - solo in overlay mode, o in fixed mode su mobile quando aperta */}
      {!sidebarCollapsed && (
        <div
          className={cn(
            'fixed inset-0 z-30 bg-black/60',
            isFixed && 'md:hidden'
          )}
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col',
          // Fixed mode: sempre visibile su desktop, overlay animato su mobile
          isFixed
            ? cn(
                'md:translate-x-0',
                'transition-transform duration-300 md:transition-none',
                sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
              )
            : cn(
                'transition-transform duration-300',
                sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
              )
        )}
      >
        {/* ═══ ZONA 1: Header App ═══ */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          {/* Icona app */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background flex items-center justify-center">
            <GadsIcon size={22} />
          </div>
          {/* Nome + versione */}
          <div className="flex-1 min-w-0">
            <p className="text-[0.95rem] font-semibold text-foreground leading-tight">
              KW GADS Audit
            </p>
            <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
          </div>
          {/* Chiudi - in fixed mode solo su mobile */}
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-1.5 rounded-lg text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors',
              isFixed && 'md:hidden'
            )}
            title="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ═══ ZONA 2: Navigazione Principale ═══ */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {/* Sezione Principale */}
          <p className="px-3 mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Principale
          </p>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const showBadge = item.path === '/dashboard' && pendingCount > 0;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-sm transition-colors mb-0.5',
                    isActive
                      ? 'nav-item-active font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                  )
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="flex-shrink-0 min-w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* ═══ ZONA 3: Navigazione Fissa (Footer) ═══ */}
        <div className="border-t border-sidebar-border py-2 px-2">
          {dynamicFooterItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-sm transition-colors mb-0.5',
                    isActive
                      ? 'nav-item-active font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                  )
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </NavLink>
            );
          })}

          {/* Guida (placeholder) */}
          <button
            className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors w-full mb-0.5"
            onClick={() => {
              handleNavClick();
              // TODO: navigare a pagina guida
            }}
          >
            <BookOpen className="h-5 w-5 flex-shrink-0" />
            Guida
          </button>

          {/* Esci */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors w-full"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            Esci
          </button>
        </div>

        {/* Info utente compatta */}
        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-xs text-muted-foreground truncate">
            {user?.email || 'user@karalisweb.net'}
          </p>
        </div>
      </aside>
    </>
  );
}
