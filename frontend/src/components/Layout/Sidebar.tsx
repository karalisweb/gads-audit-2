import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import {
  LayoutDashboard,
  Building2,
  LogOut,
  User,
  Settings,
  BookOpen,
  X,
  Target,
} from 'lucide-react';

const APP_VERSION = '2.6.0';

// Zona 2 - Navigazione Principale
const mainNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Account', icon: Building2 },
];

// Zona 3 - Navigazione Fissa (footer)
const footerNavItems = [
  { path: '/profile', label: 'Profilo', icon: User },
  { path: '/settings', label: 'Impostazioni', icon: Settings },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    toggleSidebar();
    await logout();
    navigate('/auth/login');
  };

  return (
    <>
      {/* Overlay scuro quando sidebar aperta */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/60"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar overlay */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300',
          sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
        )}
      >
        {/* ═══ ZONA 1: Header App ═══ */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          {/* Icona app */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background flex items-center justify-center">
            <Target className="h-[22px] w-[22px] text-primary" />
          </div>
          {/* Nome + versione */}
          <div className="flex-1 min-w-0">
            <p className="text-[0.95rem] font-semibold text-foreground leading-tight">
              KW GADS Audit
            </p>
            <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
          </div>
          {/* Chiudi */}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
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
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={toggleSidebar}
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
        </nav>

        {/* ═══ ZONA 3: Navigazione Fissa (Footer) ═══ */}
        <div className="border-t border-sidebar-border py-2 px-2">
          {footerNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={toggleSidebar}
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
              toggleSidebar();
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
