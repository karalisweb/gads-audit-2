import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-300',
          // Su mobile (< lg) sempre pl-0, su desktop dipende dalla sidebar
          sidebarCollapsed ? 'pl-0' : 'pl-0 lg:pl-64'
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
