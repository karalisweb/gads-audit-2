import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';

// Mappa dei titoli per le pagine desktop
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/accounts': 'Account',
  '/profile': 'Profilo',
  '/settings': 'Impostazioni',
};

export function MainLayout() {
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || 'GADS Audit';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - solo su mobile */}
      <MobileHeader />

      {/* Sidebar fissa su desktop, overlay su mobile */}
      <Sidebar mode="fixed" />

      {/* Desktop Header - sticky, con offset per sidebar fissa */}
      <header className="hidden md:block sticky top-0 z-10 bg-card border-b border-border md:pl-[260px]">
        <div className="h-16 px-6 flex items-center">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
            <p className="text-xs text-muted-foreground">Google Ads Audit Tool</p>
          </div>
        </div>
      </header>

      {/* Contenuto principale - offset per sidebar su desktop */}
      <main className="pb-16 md:pb-0 md:pl-[260px]">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav variant="main" />
    </div>
  );
}
