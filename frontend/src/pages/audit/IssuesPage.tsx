import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { formatCurrency } from '@/lib/format';
import type { PaginatedResponse, BaseFilters } from '@/types/audit';

interface AuditIssue {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored';
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  potentialSavings: number | null;
  potentialGain: number | null;
  affectedCost: number | null;
  recommendation: string | null;
  actionSteps: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface IssueSummary {
  total: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  potentialSavings: number;
}

interface IssueFilters extends BaseFilters {
  severity?: string;
  category?: string;
  status?: string;
}

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Critico' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Alto' },
  medium: { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Medio' },
  low: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Basso' },
  info: { icon: Info, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Info' },
};

const categoryLabels: Record<string, string> = {
  performance: 'Performance',
  quality: 'Qualità',
  structure: 'Struttura',
  budget: 'Budget',
  targeting: 'Targeting',
  conversion: 'Conversione',
  opportunity: 'Opportunità',
};

const columns: ColumnDef<AuditIssue>[] = [
  {
    accessorKey: 'severity',
    header: 'Gravità',
    cell: ({ row }) => {
      const severity = row.original.severity;
      const config = severityConfig[severity];
      const Icon = config.icon;
      return (
        <div className={`flex items-center gap-2 ${config.color}`}>
          <Icon className="h-4 w-4" />
          <span className="font-medium">{config.label}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'title',
    header: 'Problema',
    cell: ({ row }) => (
      <div className="max-w-md">
        <p className="font-medium">{row.original.title}</p>
        <p className="text-sm text-muted-foreground truncate">{row.original.description}</p>
      </div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Categoria',
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {categoryLabels[row.original.category] || row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: 'entityName',
    header: 'Entità',
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.entityName ? (
          <>
            <p className="truncate max-w-[150px]">{row.original.entityName}</p>
            <p className="text-xs text-muted-foreground">{row.original.entityType}</p>
          </>
        ) : (
          <span className="text-muted-foreground">Account</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'potentialSavings',
    header: 'Risparmio',
    cell: ({ row }) => {
      const savings = row.original.potentialSavings;
      if (!savings) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-green-600 font-medium">
          {formatCurrency(savings * 1_000_000)}
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => {
      const status = row.original.status;
      const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
        open: 'destructive',
        acknowledged: 'secondary',
        resolved: 'default',
        ignored: 'outline',
      };
      const labels: Record<string, string> = {
        open: 'Aperto',
        acknowledged: 'Preso in carico',
        resolved: 'Risolto',
        ignored: 'Ignorato',
      };
      return (
        <Badge variant={variants[status]} className="text-xs">
          {labels[status]}
        </Badge>
      );
    },
  },
];

export function IssuesPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<AuditIssue> | null>(null);
  const [summary, setSummary] = useState<IssueSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filters, setFilters] = useState<IssueFilters>({
    page: 1,
    limit: 50,
    sortBy: 'severity',
    sortOrder: 'ASC',
  });

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };
      if (filters.severity && filters.severity !== 'all') {
        params.severity = filters.severity;
      }
      if (filters.category && filters.category !== 'all') {
        params.category = filters.category;
      }
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }

      const [issuesResult, summaryResult] = await Promise.all([
        apiClient.get<PaginatedResponse<AuditIssue>>(
          `/audit/accounts/${accountId}/issues`,
          params,
        ),
        apiClient.get<IssueSummary>(`/audit/accounts/${accountId}/issues/summary`),
      ]);
      setData(issuesResult);
      setSummary(summaryResult);
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runAnalysis = async () => {
    if (!accountId) return;
    setIsAnalyzing(true);
    try {
      await apiClient.post(`/audit/accounts/${accountId}/analyze`);
      await loadData();
    } catch (err) {
      console.error('Failed to run analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Problemi Rilevati</h2>
          <p className="text-muted-foreground">
            Analisi automatica dell'account con suggerimenti di ottimizzazione
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={isAnalyzing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analisi in corso...' : 'Riesegui Analisi'}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Problemi Totali</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="flex gap-2 mt-2">
                {summary.bySeverity.critical > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {summary.bySeverity.critical} critici
                  </Badge>
                )}
                {summary.bySeverity.high > 0 && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                    {summary.bySeverity.high} alti
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risparmio Potenziale</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.potentialSavings * 1_000_000)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Stima basata sui problemi rilevati
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Qualità</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.byCategory.quality || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Problemi di qualità</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.byCategory.performance || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Problemi di performance</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={filters.severity || 'all'}
          onValueChange={(value) =>
            setFilters((prev: IssueFilters) => ({
              ...prev,
              severity: value === 'all' ? undefined : value,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Gravità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le gravità</SelectItem>
            <SelectItem value="critical">Critico</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
            <SelectItem value="medium">Medio</SelectItem>
            <SelectItem value="low">Basso</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.category || 'all'}
          onValueChange={(value) =>
            setFilters((prev: IssueFilters) => ({
              ...prev,
              category: value === 'all' ? undefined : value,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le categorie</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="quality">Qualità</SelectItem>
            <SelectItem value="structure">Struttura</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
            <SelectItem value="targeting">Targeting</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            setFilters((prev: IssueFilters) => ({
              ...prev,
              status: value === 'all' ? undefined : value,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="open">Aperto</SelectItem>
            <SelectItem value="acknowledged">Preso in carico</SelectItem>
            <SelectItem value="resolved">Risolto</SelectItem>
            <SelectItem value="ignored">Ignorato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issues Table */}
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
        onPageChange={(page) => setFilters((prev: IssueFilters) => ({ ...prev, page: page + 1 }))}
        onPageSizeChange={(limit) => setFilters((prev: IssueFilters) => ({ ...prev, limit, page: 1 }))}
        onSortChange={(sortBy, sortOrder) =>
          setFilters((prev: IssueFilters) => ({ ...prev, sortBy, sortOrder, page: 1 }))
        }
      />
    </div>
  );
}
