import { Outlet, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { getAccounts } from '@/api/audit';
import type { GoogleAdsAccount } from '@/types/audit';

export function MainLayout() {
  const { accountId } = useParams<{ accountId: string }>();
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);

  useEffect(() => {
    getAccounts()
      .then((data) => setAccounts(data))
      .catch((err) => console.error('Failed to load accounts:', err));
  }, []);

  const sidebarAccounts = accounts.map((acc) => ({
    id: acc.id,
    name: acc.customerName || acc.customerId,
    customerId: acc.customerId,
    hasUrgent: false, // TODO: Calculate from issues
  }));

  return (
    <div className="min-h-screen bg-background">
      <Sidebar accounts={sidebarAccounts} currentAccountId={accountId} />
      <main className="pl-64">
        <Outlet />
      </main>
    </div>
  );
}
