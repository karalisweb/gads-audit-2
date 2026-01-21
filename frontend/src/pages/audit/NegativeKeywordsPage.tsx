import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LayoutGrid, Table2, List, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getNegativeKeywords } from '@/api/audit';
import { formatMatchType } from '@/lib/format';
import type { NegativeKeyword, PaginatedResponse, BaseFilters } from '@/types/audit';

const columns: ColumnDef<NegativeKeyword>[] = [
  {
    accessorKey: 'keywordText',
    header: 'Keyword Negativa',
    cell: ({ row }) => (
      <p className="font-medium">{row.original.keywordText}</p>
    ),
  },
  {
    accessorKey: 'matchType',
    header: 'Match Type',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {formatMatchType(row.original.matchType)}
      </Badge>
    ),
  },
  {
    accessorKey: 'level',
    header: 'Livello',
    cell: ({ row }) => {
      const level = row.original.level;
      const variant = level === 'SHARED_SET' ? 'default' : level === 'CAMPAIGN' ? 'secondary' : 'outline';
      return (
        <Badge variant={variant} className="text-xs">
          {level === 'SHARED_SET' ? 'Lista condivisa' : level === 'CAMPAIGN' ? 'Campagna' : 'Ad Group'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'sharedSetName',
    header: 'Lista / Campagna',
    cell: ({ row }) => {
      if (row.original.sharedSetName) {
        return <span className="text-sm text-blue-600">{row.original.sharedSetName}</span>;
      }
      if (row.original.campaignName) {
        return <span className="text-sm">{row.original.campaignName}</span>;
      }
      return <span className="text-sm text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: 'adGroupName',
    header: 'Ad Group',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.adGroupName || '-'}</span>
    ),
  },
];

interface GroupedNegatives {
  name: string;
  level: string;
  count: number;
  keywords: NegativeKeyword[];
  matchTypes: { [key: string]: number };
}

function SharedSetCard({ group, isOpen, onToggle }: { group: GroupedNegatives; isOpen: boolean; onToggle: () => void }) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={group.level === 'SHARED_SET' ? 'default' : 'secondary'} className="text-xs">
                    {group.level === 'SHARED_SET' ? 'Lista condivisa' : group.level === 'CAMPAIGN' ? 'Campagna' : 'Ad Group'}
                  </Badge>
                  <span className="text-sm font-medium">{group.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{group.count} keyword</span>
                  {Object.entries(group.matchTypes).map(([type, count]) => (
                    <span key={type}>{formatMatchType(type)}: {count}</span>
                  ))}
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/30">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {group.keywords.map((kw) => (
                <div key={kw.id} className="flex items-center gap-2 text-sm py-1 px-2 bg-background rounded border">
                  <Badge variant="outline" className="text-xs shrink-0">
                    {formatMatchType(kw.matchType)}
                  </Badge>
                  <span className="truncate">{kw.keywordText}</span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function NegativeKeywordCard({ keyword }: { keyword: NegativeKeyword }) {
  return (
    <div className="border rounded-lg bg-card p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {formatMatchType(keyword.matchType)}
            </Badge>
            <Badge
              variant={keyword.level === 'SHARED_SET' ? 'default' : keyword.level === 'CAMPAIGN' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {keyword.level === 'SHARED_SET' ? 'Lista' : keyword.level}
            </Badge>
          </div>
          <p className="text-sm font-medium">{keyword.keywordText}</p>
          {keyword.sharedSetName && (
            <p className="text-xs text-blue-600 truncate">
              {keyword.sharedSetName}
            </p>
          )}
          {keyword.campaignName && !keyword.sharedSetName && (
            <p className="text-xs text-muted-foreground truncate">
              {keyword.campaignName}
              {keyword.adGroupName && ` > ${keyword.adGroupName}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function NegativeKeywordsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const isMobile = useIsMobile();
  const [data, setData] = useState<PaginatedResponse<NegativeKeyword> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<BaseFilters>({
    page: 1,
    limit: 500, // Carichiamo più dati per il raggruppamento
    sortBy: 'keywordText',
    sortOrder: 'ASC',
  });
  const [searchInput, setSearchInput] = useState('');
  // Su mobile forziamo 'grouped', su desktop è selezionabile
  const [viewMode, setViewMode] = useState<'grouped' | 'cards' | 'table'>('grouped');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  // Su mobile forza sempre la vista raggruppata (no tabella)
  const effectiveViewMode = isMobile ? 'grouped' : viewMode;

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const result = await getNegativeKeywords(accountId, filters);
      setData(result);
    } catch (err) {
      console.error('Failed to load negative keywords:', err);
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

  // Raggruppa le keyword per lista condivisa/campagna
  const groupedData = useMemo(() => {
    if (!data?.data) return [];

    let filtered = data.data;
    if (levelFilter !== 'all') {
      filtered = filtered.filter(kw => kw.level === levelFilter);
    }

    const groups: { [key: string]: GroupedNegatives } = {};

    filtered.forEach(kw => {
      let groupKey: string;
      let groupName: string;

      if (kw.sharedSetName) {
        groupKey = `shared_${kw.sharedSetId}`;
        groupName = kw.sharedSetName;
      } else if (kw.campaignName) {
        groupKey = `campaign_${kw.campaignId}${kw.adGroupId ? `_${kw.adGroupId}` : ''}`;
        groupName = kw.adGroupName ? `${kw.campaignName} > ${kw.adGroupName}` : kw.campaignName;
      } else {
        groupKey = 'other';
        groupName = 'Altre';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupName,
          level: kw.level,
          count: 0,
          keywords: [],
          matchTypes: {},
        };
      }

      groups[groupKey].count++;
      groups[groupKey].keywords.push(kw);
      groups[groupKey].matchTypes[kw.matchType] = (groups[groupKey].matchTypes[kw.matchType] || 0) + 1;
    });

    return Object.values(groups).sort((a, b) => {
      // Prima le liste condivise, poi campagne, poi ad group
      const levelOrder = { SHARED_SET: 0, CAMPAIGN: 1, AD_GROUP: 2 };
      const levelDiff = (levelOrder[a.level as keyof typeof levelOrder] || 3) - (levelOrder[b.level as keyof typeof levelOrder] || 3);
      if (levelDiff !== 0) return levelDiff;
      return b.count - a.count;
    });
  }, [data, levelFilter]);

  // Statistiche
  const stats = useMemo(() => {
    if (!data?.data) return { total: 0, sharedSets: 0, campaigns: 0, adGroups: 0, matchTypes: {} };

    const sharedSets = new Set(data.data.filter(k => k.sharedSetId).map(k => k.sharedSetId));
    const campaigns = data.data.filter(k => k.level === 'CAMPAIGN').length;
    const adGroups = data.data.filter(k => k.level === 'AD_GROUP').length;
    const matchTypes: { [key: string]: number } = {};

    data.data.forEach(kw => {
      matchTypes[kw.matchType] = (matchTypes[kw.matchType] || 0) + 1;
    });

    return {
      total: data.meta.total,
      sharedSets: sharedSets.size,
      campaigns,
      adGroups,
      matchTypes,
    };
  }, [data]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Negative Keywords</h2>
        {/* Toggle solo su desktop - su mobile forziamo vista grouped */}
        {!isMobile && (
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as 'grouped' | 'cards' | 'table')}
            >
              <ToggleGroupItem value="grouped" aria-label="Vista raggruppata" title="Vista raggruppata">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="cards" aria-label="Vista cards" title="Vista cards">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Vista tabella" title="Vista tabella">
                <Table2 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
      </div>

      {/* Filters - responsive */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filtro livello" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i livelli</SelectItem>
            <SelectItem value="SHARED_SET">Liste condivise</SelectItem>
            <SelectItem value="CAMPAIGN">Campagna</SelectItem>
            <SelectItem value="AD_GROUP">Ad Group</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Cerca..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 sm:w-48 md:w-64"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Liste condivise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sharedSets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Broad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matchTypes['BROAD'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Phrase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matchTypes['PHRASE'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Exact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matchTypes['EXACT'] || 0}</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : effectiveViewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={data?.data?.filter(kw => levelFilter === 'all' || kw.level === levelFilter) || []}
          pageCount={data?.meta.totalPages || 1}
          pageIndex={(filters.page || 1) - 1}
          pageSize={filters.limit || 50}
          total={data?.meta.total || 0}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page: page + 1 }))}
          onPageSizeChange={(limit) => setFilters((prev) => ({ ...prev, limit, page: 1 }))}
          onSortChange={(sortBy, sortOrder) =>
            setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }))
          }
        />
      ) : effectiveViewMode === 'grouped' ? (
        <div className="space-y-2">
          {groupedData.map((group) => (
            <SharedSetCard
              key={group.name}
              group={group}
              isOpen={openGroups.has(group.name)}
              onToggle={() => toggleGroup(group.name)}
            />
          ))}
          {groupedData.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nessuna keyword negativa trovata
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data?.data
              ?.filter(kw => levelFilter === 'all' || kw.level === levelFilter)
              .map((keyword) => (
                <NegativeKeywordCard key={keyword.id} keyword={keyword} />
              ))}
            {(!data?.data || data.data.length === 0) && (
              <div className="text-center py-12 text-muted-foreground">
                Nessuna keyword negativa trovata
              </div>
            )}
          </div>

          {/* Pagination for cards view */}
          {(data?.meta.total || 0) > 0 && (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Mostrando {((filters.page || 1) - 1) * (filters.limit || 50) + 1}-
                {Math.min((filters.page || 1) * (filters.limit || 50), data?.meta.total || 0)} di{' '}
                {(data?.meta.total || 0).toLocaleString()} risultati
              </div>
              <div className="flex items-center space-x-6 lg:space-x-8">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">Righe per pagina</p>
                  <select
                    className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                    value={filters.limit || 50}
                    onChange={(e) => setFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                  >
                    {[25, 50, 100, 200, 500].map((size) => (
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
                    disabled={(filters.page || 1) === 1}
                  >
                    {'<<'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                    disabled={(filters.page || 1) === 1}
                  >
                    {'<'}
                  </Button>
                  <span className="text-sm">
                    Pagina {filters.page || 1} di {data?.meta.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                    disabled={(filters.page || 1) >= (data?.meta.totalPages || 1)}
                  >
                    {'>'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => ({ ...prev, page: data?.meta.totalPages || 1 }))}
                    disabled={(filters.page || 1) >= (data?.meta.totalPages || 1)}
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
