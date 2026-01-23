import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { useUIStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - solo su mobile */}
      <MobileHeader />

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
