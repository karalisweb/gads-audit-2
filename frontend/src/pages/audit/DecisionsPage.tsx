import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  Clock,
  FileDown,
  CheckSquare,
  MoreHorizontal,
  History,
  Undo2,
  Trash2,
  FileText,
} from 'lucide-react';
import {
  getDecisions,
  getDecisionSummary,
  approveDecision,
  bulkApproveDecisions,
  rollbackDecision,
  deleteDecision,
} from '@/api/decisions';
import type { PaginatedResponse } from '@/types/audit';
import type {
  Decision,
  DecisionFilters,
  DecisionSummary,
  DecisionStatus,
} from '@/types/decisions';
import {
  MODULE_NAMES as moduleNames,
  ENTITY_TYPE_LABELS as entityLabels,
  ACTION_TYPE_LABELS as actionLabels,
  STATUS_LABELS as statusLabels,
} from '@/types/decisions';

const statusColors: Record<DecisionStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-500/20 text-blue-400',
  exported: 'bg-green-500/20 text-green-400',
  applied: 'bg-purple-500/20 text-purple-400',
  rolled_back: 'bg-orange-500/20 text-orange-400',
};

export function DecisionsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<Decision> | null>(null);
  const [summary, setSummary] = useState<DecisionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<DecisionFilters>({
    page: 1,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
    currentOnly: true,
  });

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const [decisionsResult, summaryResult] = await Promise.all([
        getDecisions(accountId, filters),
        getDecisionSummary(accountId),
      ]);
      setData(decisionsResult);
      setSummary(summaryResult);
    } catch (err) {
      console.error('Failed to load decisions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (id: string) => {
    try {
      await approveDecision(id);
      await loadData();
    } catch (err) {
      console.error('Failed to approve decision:', err);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkApproveDecisions(selectedIds);
      setSelectedIds([]);
      await loadData();
    } catch (err) {
      console.error('Failed to bulk approve:', err);
    }
  };

  const handleRollback = async (id: string) => {
    try {
      await rollbackDecision(id);
      await loadData();
    } catch (err) {
      console.error('Failed to rollback decision:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa decisione?')) return;
    try {
      await deleteDecision(id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete decision:', err);
    }
  };

  const columns: ColumnDef<Decision>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => {
            table.toggleAllPageRowsSelected(e.target.checked);
            if (e.target.checked) {
              setSelectedIds(data?.data.map(d => d.id) || []);
            } else {
              setSelectedIds([]);
            }
          }}
          className="h-4 w-4"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.original.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds([...selectedIds, row.original.id]);
            } else {
              setSelectedIds(selectedIds.filter(id => id !== row.original.id));
            }
          }}
          className="h-4 w-4"
        />
      ),
    },
    {
      accessorKey: 'moduleId',
      header: 'Modulo',
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          M{String(row.original.moduleId).padStart(2, '0')}
        </span>
      ),
    },
    {
      accessorKey: 'entityType',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {entityLabels[row.original.entityType] || row.original.entityType}
        </Badge>
      ),
    },
    {
      accessorKey: 'entityName',
      header: 'Entità',
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="truncate font-medium">{row.original.entityName || row.original.entityId}</p>
        </div>
      ),
    },
    {
      accessorKey: 'actionType',
      header: 'Azione',
      cell: ({ row }) => (
        <span className="text-sm">
          {actionLabels[row.original.actionType] || row.original.actionType}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => (
        <Badge className={`${statusColors[row.original.status]} text-xs`}>
          {statusLabels[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: 'version',
      header: 'Ver.',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">v{row.original.version}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Data',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString('it-IT')}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const decision = row.original;
        const canApprove = decision.status === 'draft';
        const canRollback = decision.status !== 'applied' && decision.status !== 'rolled_back';
        const canDelete = decision.status !== 'exported' && decision.status !== 'applied';

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/audit/${accountId}/decisions/${decision.decisionGroupId}/history`}>
                  <History className="h-4 w-4 mr-2" />
                  Storico versioni
                </Link>
              </DropdownMenuItem>
              {canApprove && (
                <DropdownMenuItem onClick={() => handleApprove(decision.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approva
                </DropdownMenuItem>
              )}
              {canRollback && (
                <DropdownMenuItem onClick={() => handleRollback(decision.id)}>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Rollback
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => handleDelete(decision.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Elimina
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const draftCount = summary?.byStatus?.draft || 0;
  const approvedCount = summary?.byStatus?.approved || 0;
  const exportedCount = summary?.byStatus?.exported || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Decisioni</h2>
          <p className="text-muted-foreground">
            Gestisci le decisioni prese durante l'audit
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button onClick={handleBulkApprove} variant="outline">
              <CheckSquare className="h-4 w-4 mr-2" />
              Approva selezionate ({selectedIds.length})
            </Button>
          )}
          <Button asChild>
            <Link to={`/audit/${accountId}/export`}>
              <FileDown className="h-4 w-4 mr-2" />
              Esporta
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Decisioni</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bozze</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{draftCount}</div>
            <p className="text-xs text-muted-foreground">Da approvare</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approvate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Pronte per export</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esportate</CardTitle>
            <FileDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{exportedCount}</div>
            <p className="text-xs text-muted-foreground">Già esportate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              status: value === 'all' ? undefined : (value as DecisionStatus),
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="draft">Bozza</SelectItem>
            <SelectItem value="approved">Approvata</SelectItem>
            <SelectItem value="exported">Esportata</SelectItem>
            <SelectItem value="applied">Applicata</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.entityType || 'all'}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              entityType: value === 'all' ? undefined : value,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo entità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i tipi</SelectItem>
            <SelectItem value="campaign">Campagna</SelectItem>
            <SelectItem value="ad_group">Gruppo annunci</SelectItem>
            <SelectItem value="keyword">Keyword</SelectItem>
            <SelectItem value="negative_keyword_campaign">Negativa (campagna)</SelectItem>
            <SelectItem value="negative_keyword_adgroup">Negativa (gruppo)</SelectItem>
            <SelectItem value="ad">Annuncio</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={String(filters.moduleId) || 'all'}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              moduleId: value === 'all' ? undefined : parseInt(value, 10),
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Modulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i moduli</SelectItem>
            {Object.entries(moduleNames).map(([id, name]) => (
              <SelectItem key={id} value={id}>
                M{String(id).padStart(2, '0')} - {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Decisions Table */}
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
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page: page + 1 }))}
        onPageSizeChange={(limit) => setFilters((prev) => ({ ...prev, limit, page: 1 }))}
        onSortChange={(sortBy, sortOrder) =>
          setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }))
        }
      />
    </div>
  );
}
