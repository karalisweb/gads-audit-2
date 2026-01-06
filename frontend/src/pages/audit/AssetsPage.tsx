import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LayoutGrid, Table2 } from 'lucide-react';
import { getAssets } from '@/api/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  getAdStrengthVariant,
} from '@/lib/format';
import type { Asset, PaginatedResponse, AssetFilters } from '@/types/audit';

const assetTypes = [
  { value: 'all', label: 'Tutti i tipi' },
  { value: 'CALLOUT', label: 'Callout' },
  { value: 'SITELINK', label: 'Sitelink' },
  { value: 'STRUCTURED_SNIPPET', label: 'Structured Snippet' },
  { value: 'TEXT', label: 'Text' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'YOUTUBE_VIDEO', label: 'YouTube Video' },
  { value: 'CALL_TO_ACTION', label: 'Call to Action' },
  { value: 'CALL', label: 'Call' },
  { value: 'MOBILE_APP', label: 'Mobile App' },
  { value: 'HOTEL_CALLOUT', label: 'Hotel Callout' },
  { value: 'PRICE', label: 'Price' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'LEAD_FORM', label: 'Lead Form' },
  { value: 'BUSINESS_NAME', label: 'Business Name' },
  { value: 'MARKETING_IMAGE', label: 'Marketing Image' },
  { value: 'SQUARE_MARKETING_IMAGE', label: 'Square Marketing Image' },
  { value: 'LOGO', label: 'Logo' },
  { value: 'LANDSCAPE_LOGO', label: 'Landscape Logo' },
];

const assetTypeLabels: Record<string, string> = {
  CALLOUT: 'Callout',
  SITELINK: 'Sitelink',
  STRUCTURED_SNIPPET: 'Structured Snippet',
  TEXT: 'Testo',
  IMAGE: 'Immagine',
  YOUTUBE_VIDEO: 'Video YouTube',
  CALL_TO_ACTION: 'Call to Action',
  CALL: 'Chiamata',
  MOBILE_APP: 'App Mobile',
  HOTEL_CALLOUT: 'Hotel Callout',
  PRICE: 'Prezzo',
  PROMOTION: 'Promozione',
  LEAD_FORM: 'Lead Form',
  BUSINESS_NAME: 'Nome Attività',
  MARKETING_IMAGE: 'Immagine Marketing',
  SQUARE_MARKETING_IMAGE: 'Immagine Quadrata',
  LOGO: 'Logo',
  LANDSCAPE_LOGO: 'Logo Orizzontale',
};

// Table columns for extended view
const columns: ColumnDef<Asset>[] = [
  {
    accessorKey: 'assetType',
    header: 'Tipo',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {assetTypeLabels[row.original.assetType] || row.original.assetType.replace(/_/g, ' ')}
      </Badge>
    ),
  },
  {
    id: 'content',
    header: 'Contenuto',
    cell: ({ row }) => {
      const text = row.original.assetText || row.original.description1 || row.original.finalUrl || row.original.phoneNumber;
      return (
        <div className="max-w-[200px]">
          <p className="text-sm truncate">{text || '-'}</p>
        </div>
      );
    },
  },
  {
    accessorKey: 'linkedLevel',
    header: 'Livello',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.linkedLevel || '-'}</span>
    ),
  },
  {
    accessorKey: 'performanceLabel',
    header: 'Performance',
    cell: ({ row }) => {
      const label = row.original.performanceLabel;
      if (!label || label === 'UNSPECIFIED' || label === 'UNKNOWN') return '-';
      return (
        <Badge variant={getAdStrengthVariant(label)} className="text-xs">
          {label.replace(/_/g, ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'impressions',
    header: 'Impr.',
    cell: ({ row }) => formatNumber(row.original.impressions),
  },
  {
    accessorKey: 'clicks',
    header: 'Click',
    cell: ({ row }) => formatNumber(row.original.clicks),
  },
  {
    accessorKey: 'ctr',
    header: 'CTR',
    cell: ({ row }) => formatCtr(row.original.ctr),
  },
  {
    accessorKey: 'costMicros',
    header: 'Costo',
    cell: ({ row }) => formatCurrency(row.original.costMicros),
  },
  {
    id: 'cpc',
    header: 'CPC',
    cell: ({ row }) => {
      const cost = parseFloat(row.original.costMicros) || 0;
      const clicks = parseFloat(row.original.clicks) || 0;
      return clicks > 0 ? formatCurrency(cost / clicks) : '-';
    },
  },
  {
    accessorKey: 'conversions',
    header: 'Conv.',
    cell: ({ row }) => formatNumber(row.original.conversions),
  },
  {
    id: 'cpa',
    header: 'CPA',
    cell: ({ row }) => {
      const cost = parseFloat(row.original.costMicros) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      return conv > 0 ? formatCurrency(cost / conv) : '-';
    },
  },
];

function AssetCard({ asset }: { asset: Asset }) {
  const [isOpen, setIsOpen] = useState(false);

  const cost = parseFloat(asset.costMicros) || 0;
  const conv = parseFloat(asset.conversions) || 0;
  const clicks = parseFloat(asset.clicks) || 0;
  const cpa = conv > 0 ? cost / conv : 0;

  // Get display text based on asset type
  const getAssetDisplayText = () => {
    if (asset.assetText) return asset.assetText;
    if (asset.description1) return asset.description1;
    if (asset.finalUrl) return asset.finalUrl;
    if (asset.phoneNumber) return asset.phoneNumber;
    return null;
  };

  const displayText = getAssetDisplayText();
  const hasDetails = asset.description1 || asset.description2 || asset.finalUrl;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {assetTypeLabels[asset.assetType] || asset.assetType.replace(/_/g, ' ')}
                  </Badge>
                  {asset.linkedLevel && (
                    <Badge variant="secondary" className="text-xs">
                      {asset.linkedLevel}
                    </Badge>
                  )}
                  {asset.performanceLabel &&
                   asset.performanceLabel !== 'UNSPECIFIED' &&
                   asset.performanceLabel !== 'UNKNOWN' && (
                    <Badge variant={getAdStrengthVariant(asset.performanceLabel)} className="text-xs">
                      {asset.performanceLabel.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                {displayText ? (
                  <p className="text-sm font-medium">{displayText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nessun testo disponibile</p>
                )}
                {asset.status && (
                  <p className="text-xs text-muted-foreground">{asset.status}</p>
                )}
              </div>
              <div className="grid grid-cols-4 gap-4 text-right shrink-0">
                <div>
                  <p className="text-xs text-muted-foreground">Impr.</p>
                  <p className="text-sm font-medium">{formatNumber(asset.impressions)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Click</p>
                  <p className="text-sm font-medium">{formatNumber(asset.clicks)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Costo</p>
                  <p className="text-sm font-medium">{formatCurrency(asset.costMicros)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conv.</p>
                  <p className="text-sm font-medium">{formatNumber(asset.conversions)}</p>
                </div>
              </div>
              {hasDetails && (
                <div className="flex items-center">
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        {hasDetails && (
          <CollapsibleContent>
            <div className="border-t p-4 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Testo principale */}
                {asset.assetText && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Testo</h4>
                    <p className="text-sm bg-background rounded border p-2">{asset.assetText}</p>
                  </div>
                )}

                {/* Descrizioni (per sitelink/structured snippets) */}
                {(asset.description1 || asset.description2) && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Descrizioni</h4>
                    <div className="space-y-1">
                      {asset.description1 && (
                        <p className="text-sm bg-background rounded border p-2">{asset.description1}</p>
                      )}
                      {asset.description2 && (
                        <p className="text-sm bg-background rounded border p-2">{asset.description2}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* URL finale */}
                {asset.finalUrl && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-semibold mb-1">URL finale</h4>
                    <a
                      href={asset.finalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {asset.finalUrl}
                    </a>
                  </div>
                )}

                {/* Numero telefono */}
                {asset.phoneNumber && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Telefono</h4>
                    <p className="text-sm">{asset.phoneNumber}</p>
                  </div>
                )}
              </div>

              {/* Metriche dettagliate */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Metriche dettagliate</h4>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">CTR</p>
                    <p className="text-sm font-medium">{formatCtr(asset.ctr)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPC medio</p>
                    <p className="text-sm font-medium">
                      {clicks > 0 ? formatCurrency(cost / clicks) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPA</p>
                    <p className="text-sm font-medium">
                      {cpa > 0 ? formatCurrency(cpa) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tasso conv.</p>
                    <p className="text-sm font-medium">
                      {clicks > 0 ? `${((conv / clicks) * 100).toFixed(2)}%` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Origine</p>
                    <p className="text-sm font-medium">{asset.source || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export function AssetsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<Asset> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AssetFilters>({
    page: 1,
    limit: 50,
    sortBy: 'costMicros',
    sortOrder: 'DESC',
  });
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const result = await getAssets(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev: AssetFilters) => ({ ...prev, search: searchInput || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const pageIndex = (filters.page || 1) - 1;
  const pageSize = filters.limit || 50;
  const pageCount = data?.meta.totalPages || 1;
  const total = data?.meta.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Assets</h2>
        <div className="flex items-center gap-4">
          <Select
            value={filters.assetType || 'all'}
            onValueChange={(value) =>
              setFilters((prev: AssetFilters) => ({
                ...prev,
                assetType: value === 'all' ? undefined : value,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo asset" />
            </SelectTrigger>
            <SelectContent>
              {assetTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Cerca asset..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as 'cards' | 'table')}
          >
            <ToggleGroupItem value="cards" aria-label="Vista compatta" title="Vista compatta (cards)">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Vista estesa" title="Vista estesa (tabella)">
              <Table2 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={data?.data || []}
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          total={total}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page: page + 1 }))}
          onPageSizeChange={(size) => setFilters((prev) => ({ ...prev, limit: size, page: 1 }))}
        />
      ) : (
        <>
          <div className="space-y-2">
            {data?.data.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
            {(!data?.data || data.data.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                Nessun asset trovato
              </div>
            )}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Mostrando {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, total)} di{' '}
                {total.toLocaleString()} risultati
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Righe per pagina</p>
                  <select
                    className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                    value={pageSize}
                    onChange={(e) => setFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  >
                    {[25, 50, 100, 200].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
                    disabled={pageIndex === 0}
                  >
                    {'<<'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: pageIndex }))}
                    disabled={pageIndex === 0}
                  >
                    {'<'}
                  </Button>
                  <span className="text-sm">
                    Pagina {pageIndex + 1} di {pageCount || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: pageIndex + 2 }))}
                    disabled={pageIndex >= pageCount - 1}
                  >
                    {'>'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: pageCount }))}
                    disabled={pageIndex >= pageCount - 1}
                  >
                    {'>>'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
