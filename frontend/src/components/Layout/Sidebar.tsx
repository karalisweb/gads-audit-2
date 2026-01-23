import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import {
  LayoutDashboard,
  Building2,
  LogOut,
  User,
  Menu,
  X,
  Settings,
} from 'lucide-react';

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <>
      {/* Hamburger button - SOLO DESKTOP (lg e superiori) */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'hidden lg:block fixed top-4 right-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground hover:text-white hover:bg-sidebar-accent transition-all',
          !sidebarCollapsed && 'lg:hidden'
        )}
        title="Apri menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Overlay - SOLO DESKTOP */}
      {!sidebarCollapsed && (
        <div
          className="hidden lg:block fixed inset-0 z-30 bg-black/50"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar - SOLO DESKTOP */}
      <aside
        className={cn(
          'hidden lg:flex fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300',
          sidebarCollapsed ? '-translate-x-full w-64' : 'translate-x-0 w-64'
        )}
      >
        {/* Header with logo and close button */}
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary">Karalisweb</h1>
            <p className="text-sm text-sidebar-foreground mt-1">Google Ads Audit</p>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-sidebar-foreground hover:text-white hover:bg-sidebar-accent transition-colors"
            title="Chiudi menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            onClick={() => toggleSidebar()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
              )
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </NavLink>

          {/* Account */}
          <NavLink
            to="/accounts"
            onClick={() => toggleSidebar()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
              )
            }
          >
            <Building2 className="h-5 w-5" />
            Account
          </NavLink>

          {/* Profilo */}
          <NavLink
            to="/profile"
            onClick={() => toggleSidebar()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
              )
            }
          >
            <User className="h-5 w-5" />
            Profilo
          </NavLink>

          {/* Impostazioni */}
          <NavLink
            to="/settings"
            onClick={() => toggleSidebar()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-white'
              )
            }
          >
            <Settings className="h-5 w-5" />
            Impostazioni
          </NavLink>
        </nav>

        {/* User Profile */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent">
              <User className="h-5 w-5 text-sidebar-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-sidebar-foreground hover:text-white hover:bg-sidebar-accent transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Version */}
        <div className="px-4 pb-4">
          <p className="text-xs text-sidebar-foreground/50 text-center">v2.0.0</p>
        </div>
      </aside>
    </>
  );
}
