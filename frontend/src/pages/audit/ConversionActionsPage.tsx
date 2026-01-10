import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { LayoutGrid, Table2, Target, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ModifyButton } from '@/components/modifications';
import { getConversionActions } from '@/api/audit';
import { formatCurrency } from '@/lib/format';
import type { ConversionAction, PaginatedResponse, ConversionActionFilters } from '@/types/audit';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'ENABLED':
      return 'default';
    case 'REMOVED':
      return 'destructive';
    case 'HIDDEN':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    PURCHASE: 'Acquisto',
    LEAD: 'Lead',
    SIGNUP: 'Registrazione',
    PAGE_VIEW: 'Visualizzazione pagina',
    CONTACT: 'Contatto',
    SUBMIT_LEAD_FORM: 'Invio form',
    BOOK_APPOINTMENT: 'Prenotazione',
    REQUEST_QUOTE: 'Richiesta preventivo',
    GET_DIRECTIONS: 'Indicazioni',
    OUTBOUND_CLICK: 'Click in uscita',
    DOWNLOAD: 'Download',
    ADD_TO_CART: 'Aggiungi al carrello',
    BEGIN_CHECKOUT: 'Inizio checkout',
    SUBSCRIBE_PAID: 'Abbonamento',
    PHONE_CALL_LEAD: 'Lead telefonico',
    IMPORTED_LEAD: 'Lead importato',
    DEFAULT: 'Predefinito',
  };
  return labels[category] || category.replace(/_/g, ' ');
};

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    WEBPAGE: 'Pagina web',
    AD_CALL: 'Chiamata annuncio',
    CLICK_TO_CALL: 'Click per chiamare',
    GOOGLE_PLAY_DOWNLOAD: 'Download Google Play',
    GOOGLE_PLAY_IN_APP_PURCHASE: 'Acquisto in-app',
    UPLOAD_CALLS: 'Chiamate caricate',
    UPLOAD_CLICKS: 'Click caricati',
    STORE_SALES_DIRECT_UPLOAD: 'Vendite negozio',
    STORE_SALES_THIRD_PARTY: 'Vendite partner',
    ANALYTICS_GOAL: 'Obiettivo Analytics',
    ANALYTICS_TRANSACTION: 'Transazione Analytics',
    FIREBASE_FIRST_OPEN: 'Firebase prima apertura',
    FIREBASE_IN_APP_PURCHASE: 'Firebase acquisto',
    WEBSITE_CALL: 'Chiamata sito web',
  };
  return labels[type] || type.replace(/_/g, ' ');
};

const getOriginLabel = (origin: string) => {
  const labels: Record<string, string> = {
    WEBSITE: 'Sito web',
    CALL_FROM_ADS: 'Chiamata da annunci',
    GOOGLE_HOSTED: 'Google hosted',
    APP: 'App',
    CALL_TRACKING_EXTENSION: 'Tracciamento chiamate',
    STORE: 'Negozio',
    YOUTUBE_HOSTED: 'YouTube hosted',
  };
  return labels[origin] || origin.replace(/_/g, ' ');
};

function getColumns(accountId: string, onRefresh: () => void): ColumnDef<ConversionAction>[] {
  return [
  {
    accessorKey: 'name',
    header: 'Nome',
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <p className="font-medium truncate">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{getTypeLabel(row.original.type)}</p>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => (
      <Badge variant={getStatusVariant(row.original.status)} className="text-xs">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Categoria',
    cell: ({ row }) => (
      <span className="text-sm">{getCategoryLabel(row.original.category)}</span>
    ),
  },
  {
    accessorKey: 'origin',
    header: 'Origine',
    cell: ({ row }) => (
      <span className="text-sm">{getOriginLabel(row.original.origin)}</span>
    ),
  },
  {
    accessorKey: 'countingType',
    header: 'Conteggio',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.countingType === 'ONE_PER_CLICK' ? '1 per click' : 'Tutte'}
      </Badge>
    ),
  },
  {
    accessorKey: 'defaultValue',
    header: 'Valore',
    cell: ({ row }) => {
      const val = row.original.defaultValue;
      const always = row.original.alwaysUseDefaultValue;
      if (val === null || val === 0) return <span className="text-muted-foreground">-</span>;
      return (
        <div>
          <span className="text-sm">{formatCurrency(val * 1000000)}</span>
          {always && <span className="text-xs text-muted-foreground ml-1">(fisso)</span>}
        </div>
      );
    },
  },
  {
    accessorKey: 'primaryForGoal',
    header: 'Primaria',
    cell: ({ row }) => (
      row.original.primaryForGoal ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )
    ),
  },
  {
    accessorKey: 'campaignsUsingCount',
    header: 'Campagne',
    cell: ({ row }) => {
      const count = row.original.campaignsUsingCount;
      return count === 0 ? (
        <span className="text-orange-600">{count}</span>
      ) : (
        <span>{count}</span>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <ModifyButton
        accountId={accountId}
        entityType="conversion_action"
        entityId={row.original.conversionActionId}
        entityName={row.original.name}
        currentValue={{
          primaryForGoal: row.original.primaryForGoal,
          defaultValue: row.original.defaultValue,
        }}
        onSuccess={onRefresh}
      />
    ),
  },
];
}

function ConversionActionCard({ action, accountId, onRefresh }: { action: ConversionAction; accountId: string; onRefresh: () => void }) {
  const hasIssues = !action.primaryForGoal && action.status === 'ENABLED';
  const notUsed = action.campaignsUsingCount === 0 && action.status === 'ENABLED';
  const lowValue = (action.defaultValue === 0 || action.defaultValue === 1) && action.status === 'ENABLED';

  return (
    <div className={`border rounded-lg bg-card p-4 ${hasIssues || notUsed || lowValue ? 'border-orange-300' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={getStatusVariant(action.status)} className="text-xs">
              {action.status}
            </Badge>
            {action.primaryForGoal ? (
              <Badge variant="default" className="text-xs bg-green-600">
                Primaria
              </Badge>
            ) : action.status === 'ENABLED' && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Secondaria
              </Badge>
            )}
            {notUsed && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Non usata
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium">{action.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{getTypeLabel(action.type)}</span>
            <span>•</span>
            <span>{getCategoryLabel(action.category)}</span>
            <span>•</span>
            <span>{getOriginLabel(action.origin)}</span>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="grid grid-cols-3 gap-4 text-right shrink-0">
            <div>
              <p className="text-xs text-muted-foreground">Conteggio</p>
              <p className="text-sm font-medium">
                {action.countingType === 'ONE_PER_CLICK' ? '1 per click' : 'Tutte'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valore</p>
              <p className={`text-sm font-medium ${lowValue ? 'text-orange-600' : ''}`}>
                {action.defaultValue ? formatCurrency(action.defaultValue * 1000000) : '-'}
                {action.alwaysUseDefaultValue && action.defaultValue ? ' (fisso)' : ''}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Campagne</p>
              <p className={`text-sm font-medium ${notUsed ? 'text-orange-600' : ''}`}>
                {action.campaignsUsingCount}
              </p>
            </div>
          </div>
          <ModifyButton
            accountId={accountId}
            entityType="conversion_action"
            entityId={action.conversionActionId}
            entityName={action.name}
            currentValue={{
              primaryForGoal: action.primaryForGoal,
              defaultValue: action.defaultValue,
            }}
            onSuccess={onRefresh}
          />
        </div>
      </div>
    </div>
  );
}

export function ConversionActionsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<ConversionAction> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ConversionActionFilters>({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'ASC',
  });
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const result = await getConversionActions(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load conversion actions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Statistiche
  const stats = useMemo(() => {
    if (!data?.data) return { total: 0, enabled: 0, primary: 0, notUsed: 0, lowValue: 0 };

    const enabled = data.data.filter(a => a.status === 'ENABLED');
    const primary = data.data.filter(a => a.primaryForGoal);
    const notUsed = data.data.filter(a => a.campaignsUsingCount === 0 && a.status === 'ENABLED');
    const lowValue = data.data.filter(a =>
      (a.defaultValue === 0 || a.defaultValue === 1) && a.status === 'ENABLED'
    );

    return {
      total: data.meta.total,
      enabled: enabled.length,
      primary: primary.length,
      notUsed: notUsed.length,
      lowValue: lowValue.length,
    };
  }, [data]);

  // Filtro per status
  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (statusFilter === 'all') return data.data;
    return data.data.filter(a => a.status === statusFilter);
  }, [data, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Configurazione Conversioni</h2>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtro stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="ENABLED">Abilitati</SelectItem>
              <SelectItem value="REMOVED">Rimossi</SelectItem>
              <SelectItem value="HIDDEN">Nascosti</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Cerca conversione..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as 'cards' | 'table')}
          >
            <ToggleGroupItem value="cards" aria-label="Vista cards" title="Vista cards">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vista tabella" title="Vista tabella">
              <Table2 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Totale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Abilitate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.enabled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Primarie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.primary}</div>
          </CardContent>
        </Card>
        <Card className={stats.notUsed > 0 ? 'border-orange-300' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Non usate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.notUsed > 0 ? 'text-orange-600' : ''}`}>
              {stats.notUsed}
            </div>
          </CardContent>
        </Card>
        <Card className={stats.lowValue > 0 ? 'border-orange-300' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Valore basso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.lowValue > 0 ? 'text-orange-600' : ''}`}>
              {stats.lowValue}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={getColumns(accountId!, loadData)}
          data={filteredData}
          pageCount={data?.meta.totalPages || 1}
          pageIndex={(filters.page || 1) - 1}
          pageSize={filters.limit || 50}
          total={filteredData.length}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page: page + 1 }))}
          onPageSizeChange={(limit) => setFilters((prev) => ({ ...prev, limit, page: 1 }))}
          onSortChange={(sortBy, sortOrder) =>
            setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }))
          }
        />
      ) : (
        <div className="space-y-2">
          {filteredData.map((action) => (
            <ConversionActionCard key={action.id} action={action} accountId={accountId!} onRefresh={loadData} />
          ))}
          {filteredData.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nessuna azione di conversione trovata
            </div>
          )}
        </div>
      )}
    </div>
  );
}
