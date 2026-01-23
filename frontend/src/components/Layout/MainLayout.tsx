import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { useUIStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

// Mappa dei titoli per le pagine desktop
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/accounts': 'Account',
  '/profile': 'Profilo',
  '/settings': 'Impostazioni',
};

export function MainLayout() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || 'GADS Audit';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - solo su mobile */}
      <MobileHeader />

      {/* Desktop Header - solo su desktop */}
      <header className="hidden md:block sticky top-0 z-10 bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
              <p className="text-sm text-muted-foreground">Google Ads Audit Tool</p>
            </div>
            <button
              onClick={toggleSidebar}
              className="flex-shrink-0 p-2 rounded-lg bg-sidebar text-sidebar-foreground hover:text-white hover:bg-sidebar-accent transition-colors"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <Sidebar />

      <main
        className={cn(
          'transition-all duration-300 pb-16 md:pb-0',
          // Su mobile (< lg) sempre pl-0, su desktop dipende dalla sidebar
          sidebarCollapsed ? 'pl-0' : 'pl-0 lg:pl-64'
        )}
      >
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant="main" />
    </div>
  );
}
