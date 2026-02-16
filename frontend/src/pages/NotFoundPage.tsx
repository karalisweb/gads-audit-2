import { useNavigate } from 'react-router-dom';
import { Search, Home } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>

        <div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <p className="text-lg text-muted-foreground">
            Pagina non trovata
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            La pagina che stai cercando non esiste o e stata spostata.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" />
          Torna alla Dashboard
        </button>
      </div>
    </div>
  );
}
