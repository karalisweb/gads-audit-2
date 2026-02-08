import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { useUIStore } from '@/stores/ui.store';
import { Menu } from 'lucide-react';

// Mappa dei titoli per le pagine desktop
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/accounts': 'Account',
  '/profile': 'Profilo',
  '/settings': 'Impostazioni',
};

export function MainLayout() {
  const { toggleSidebar } = useUIStore();
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || 'GADS Audit';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - solo su mobile */}
      <MobileHeader />

      {/* Desktop Header - sticky, sempre full width */}
      <header className="hidden md:block sticky top-0 z-10 bg-card border-b border-border">
        <div className="h-16 px-6 flex items-center">
          <div className="flex items-center gap-4">
            {/* Hamburger menu */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Titolo pagina */}
            <div>
              <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
              <p className="text-xs text-muted-foreground">Google Ads Audit Tool</p>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar overlay (sia desktop che mobile) */}
      <Sidebar />

      {/* Contenuto principale - sempre full width */}
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant="main" />
    </div>
  );
}
