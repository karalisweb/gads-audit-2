import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAssets } from '@/api/audit';
import {
  formatCurrency,
  formatNumber,
  formatCtr,
  getAdStrengthVariant,
} from '@/lib/format';
import type { Asset, PaginatedResponse, AssetFilters } from '@/types/audit';

const columns: ColumnDef<Asset>[] = [
  {
    accessorKey: 'assetText',
    header: 'Asset',
    cell: ({ row }) => {
      const asset = row.original;
      if (asset.assetText) {
        return <p className="max-w-[200px] truncate">{asset.assetText}</p>;
      }
      if (asset.finalUrl) {
        return (
          <a
            href={asset.finalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs truncate max-w-[200px] block"
          >
            {asset.finalUrl}
          </a>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'assetType',
    header: 'Tipo',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.assetType.replace('_', ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'linkedLevel',
    header: 'Livello',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.original.linkedLevel || '-'}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.status || '-'}</span>
    ),
  },
  {
    accessorKey: 'source',
    header: 'Origine',
    cell: ({ row }) => (
      <span className="text-xs">{row.original.source || '-'}</span>
    ),
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
    id: 'avgCpc',
    header: 'CPC medio',
    cell: ({ row }) => {
      const cost = parseFloat(row.original.costMicros) || 0;
      const clicks = parseFloat(row.original.clicks) || 0;
      return clicks > 0 ? formatCurrency(cost / clicks) : '-';
    },
  },
  {
    accessorKey: 'costMicros',
    header: 'Costo',
    cell: ({ row }) => formatCurrency(row.original.costMicros),
  },
  {
    accessorKey: 'conversions',
    header: 'Conv.',
    cell: ({ row }) => formatNumber(row.original.conversions),
  },
  {
    id: 'cpa',
    header: 'Costo/conv',
    cell: ({ row }) => {
      const cost = parseFloat(row.original.costMicros) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      return conv > 0 ? formatCurrency(cost / conv) : '-';
    },
  },
  {
    id: 'convRate',
    header: 'Tasso conv',
    cell: ({ row }) => {
      const clicks = parseFloat(row.original.clicks) || 0;
      const conv = parseFloat(row.original.conversions) || 0;
      return clicks > 0 ? `${((conv / clicks) * 100).toFixed(2)}%` : '-';
    },
  },
  {
    accessorKey: 'performanceLabel',
    header: 'Performance',
    cell: ({ row }) => {
      const label = row.original.performanceLabel;
      if (!label || label === 'UNSPECIFIED' || label === 'UNKNOWN') {
        return <span className="text-muted-foreground">-</span>;
      }
      const variant = getAdStrengthVariant(label);
      return (
        <Badge variant={variant} className="text-xs">
          {label.replace('_', ' ')}
        </Badge>
      );
    },
  },
];

const assetTypes = [
  { value: 'all', label: 'Tutti i tipi' },
  { value: 'TEXT', label: 'Text' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'YOUTUBE_VIDEO', label: 'YouTube Video' },
  { value: 'CALL_TO_ACTION', label: 'Call to Action' },
  { value: 'SITELINK', label: 'Sitelink' },
  { value: 'STRUCTURED_SNIPPET', label: 'Structured Snippet' },
  { value: 'CALLOUT', label: 'Callout' },
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

export function AssetsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<Asset> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AssetFilters>({
    page: 1,
    limit: 50,
    sortBy: 'assetType',
    sortOrder: 'ASC',
  });
  const [searchInput, setSearchInput] = useState('');

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
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        pageCount={data?.meta.totalPages || 1}
        pageIndex={(filters.page || 1) - 1}
        pageSize={filters.limit || 50}
        total={data?.meta.total || 0}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onPageChange={(page) => setFilters((prev: AssetFilters) => ({ ...prev, page: page + 1 }))}
        onPageSizeChange={(limit) => setFilters((prev: AssetFilters) => ({ ...prev, limit, page: 1 }))}
        onSortChange={(sortBy, sortOrder) =>
          setFilters((prev: AssetFilters) => ({ ...prev, sortBy, sortOrder, page: 1 }))
        }
      />
    </div>
  );
}
