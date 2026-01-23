import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAccountsWithStats, type AccountWithStats } from '@/api/audit';
import { Clock, Building2 } from 'lucide-react';
import { AccountCard } from '@/components/AccountCard';

export function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await getAccountsWithStats();
      setAccounts(response);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Ordina per ultima modifica applicata (più vecchia prima = priorità maggiore)
  // Account senza data di modifica vanno in cima
  const sortedAccounts = [...accounts].sort((a, b) => {
    const dateA = a.lastModificationDate ? new Date(a.lastModificationDate).getTime() : 0;
    const dateB = b.lastModificationDate ? new Date(b.lastModificationDate).getTime() : 0;
    return dateA - dateB; // Più vecchio prima
  });

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-20 w-full mb-3" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Account ordinati per priorità (modifica più lontana nel tempo)
        </p>
      </div>

      {/* Priority Section */}
      {accounts.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Priorità Account
          </h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {sortedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                showActions={false}
              />
            ))}
          </div>
        </section>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nessun account configurato</h3>
            <p className="text-muted-foreground mt-2 text-sm mb-4">
              Aggiungi il tuo primo account Google Ads per iniziare
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/accounts">Aggiungi Account</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
