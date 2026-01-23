import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title?: string;
  subtitle?: string;
}

// Mappa dei titoli per le pagine
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/accounts': 'Account',
  '/profile': 'Profilo',
  // Audit pages
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

export function MobileHeader({ title, subtitle }: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // Determina il titolo dalla pagina corrente
  const getPageTitle = () => {
    if (title) return title;

    // Per le pagine audit, prendi l'ultimo segmento del path
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Controlla se siamo in una pagina audit
    if (pathSegments.includes('audit')) {
      return pageTitles[lastSegment] || 'Audit';
    }

    return pageTitles[location.pathname] || 'GADS Audit';
  };

  return (
    <header className="md:hidden sticky top-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo e titolo */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">G</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {getPageTitle()}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Azioni a destra */}
        <div className="flex items-center gap-2">
          {/* Notifiche (placeholder) */}
          <button
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Notifiche"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* Profilo */}
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
    </header>
  );
}
