import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data-table/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, AlertCircle, Clock, Loader2, Plus } from 'lucide-react';
import { CreateModificationModal } from './CreateModificationModal';
import {
  getModifications,
  getModificationSummary,
  approveModification,
  rejectModification,
  cancelModification,
} from '@/api/modifications';
import type {
  Modification,
  ModificationFilters,
  ModificationSummary,
  ModificationStatus,
  PaginatedResponse,
} from '@/types';
import {
  getStatusColor,
  getStatusLabel,
  getModificationTypeLabel,
  getEntityTypeLabel,
} from '@/types/modification';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('budget' in obj) {
      return `€${(Number(obj.budget) / 1000000).toFixed(2)}`;
    }
    if ('cpcBid' in obj) {
      return `€${(Number(obj.cpcBid) / 1000000).toFixed(2)}`;
    }
    if ('status' in obj) {
      return String(obj.status);
    }
    return JSON.stringify(value);
  }
  return String(value);
}

export function ModificationsPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const [data, setData] = useState<PaginatedResponse<Modification> | null>(
    null,
  );
  const [summary, setSummary] = useState<ModificationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ModificationFilters>({
    page: 1,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedModId, setSelectedModId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const appliedFilters: ModificationFilters = {
        ...filters,
        status:
          statusFilter !== 'all'
            ? (statusFilter as ModificationStatus)
            : undefined,
      };
      const [modsResult, summaryResult] = await Promise.all([
        getModifications(accountId, appliedFilters),
        getModificationSummary(accountId),
      ]);
      setData(modsResult);
      setSummary(summaryResult);
    } catch (err) {
      console.error('Error fetching modifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, filters, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await approveModification(id);
      fetchData();
    } catch (err) {
      console.error('Error approving:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedModId) return;
    setActionLoading(selectedModId);
    try {
      await rejectModification(selectedModId, rejectReason);
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedModId(null);
      fetchData();
    } catch (err) {
      console.error('Error rejecting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      await cancelModification(id);
      fetchData();
    } catch (err) {
      console.error('Error cancelling:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Expose handleCancel for future use (e.g., cancel button on pending modifications)
  void handleCancel;

  const openRejectDialog = (id: string) => {
    setSelectedModId(id);
    setRejectDialogOpen(true);
  };

  const columns: ColumnDef<Modification>[] = [
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>
          {getStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: 'entityType',
      header: 'Tipo',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">
            {getEntityTypeLabel(row.original.entityType)}
          </p>
          <p className="text-xs text-muted-foreground">
            {getModificationTypeLabel(row.original.modificationType)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'entityName',
      header: 'Entità',
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-medium truncate">
            {row.original.entityName || row.original.entityId}
          </p>
          <p className="text-xs text-muted-foreground">
            ID: {row.original.entityId}
          </p>
        </div>
      ),
    },
    {
      id: 'change',
      header: 'Modifica',
      cell: ({ row }) => (
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Da:</span>
            <span>{formatValue(row.original.beforeValue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">A:</span>
            <span className="font-medium text-primary">
              {formatValue(row.original.afterValue)}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'createdBy',
      header: 'Creata da',
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.createdBy?.email || '-'}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </p>
        </div>
      ),
    },
    {
      id: 'result',
      header: 'Risultato',
      cell: ({ row }) => {
        const mod = row.original;
        if (mod.status === 'applied') {
          return (
            <div className="text-sm text-green-600">
              <Check className="h-4 w-4 inline mr-1" />
              {mod.resultMessage || 'Applicata'}
            </div>
          );
        }
        if (mod.status === 'failed') {
          return (
            <div className="text-sm text-red-600" title={mod.resultMessage || ''}>
              <AlertCircle className="h-4 w-4 inline mr-1" />
              {mod.resultMessage?.substring(0, 30) || 'Errore'}
            </div>
          );
        }
        if (mod.status === 'rejected') {
          return (
            <div
              className="text-sm text-red-600"
              title={mod.rejectionReason || ''}
            >
              <X className="h-4 w-4 inline mr-1" />
              Rifiutata
            </div>
          );
        }
        if (mod.status === 'processing') {
          return (
            <div className="text-sm text-purple-600">
              <Loader2 className="h-4 w-4 inline mr-1 animate-spin" />
              In elaborazione
            </div>
          );
        }
        return null;
      },
    },
    {
      id: 'actions',
      header: 'Azioni',
      cell: ({ row }) => {
        const mod = row.original;
        const isLoading = actionLoading === mod.id;

        if (mod.status === 'pending') {
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => handleApprove(mod.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => openRejectDialog(mod.id)}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        }

        if (mod.status === 'approved') {
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              In attesa script
            </div>
          );
        }

        return null;
      },
    },
  ];

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modifiche Google Ads</h1>
          <p className="text-muted-foreground">
            Gestisci le modifiche pendenti e visualizza lo storico
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Modifica
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <SummaryCard
            label="Totale"
            value={summary.total}
            onClick={() => setStatusFilter('all')}
            active={statusFilter === 'all'}
          />
          <SummaryCard
            label="In Attesa"
            value={summary.byStatus.pending || 0}
            color="bg-yellow-500"
            onClick={() => setStatusFilter('pending')}
            active={statusFilter === 'pending'}
          />
          <SummaryCard
            label="Approvate"
            value={summary.byStatus.approved || 0}
            color="bg-blue-500"
            onClick={() => setStatusFilter('approved')}
            active={statusFilter === 'approved'}
          />
          <SummaryCard
            label="In Elaborazione"
            value={summary.byStatus.processing || 0}
            color="bg-purple-500"
            onClick={() => setStatusFilter('processing')}
            active={statusFilter === 'processing'}
          />
          <SummaryCard
            label="Applicate"
            value={summary.byStatus.applied || 0}
            color="bg-green-500"
            onClick={() => setStatusFilter('applied')}
            active={statusFilter === 'applied'}
          />
          <SummaryCard
            label="Fallite"
            value={summary.byStatus.failed || 0}
            color="bg-red-500"
            onClick={() => setStatusFilter('failed')}
            active={statusFilter === 'failed'}
          />
          <SummaryCard
            label="Rifiutate"
            value={summary.byStatus.rejected || 0}
            color="bg-gray-500"
            onClick={() => setStatusFilter('rejected')}
            active={statusFilter === 'rejected'}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtra per stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="pending">In Attesa</SelectItem>
            <SelectItem value="approved">Approvate</SelectItem>
            <SelectItem value="processing">In Elaborazione</SelectItem>
            <SelectItem value="applied">Applicate</SelectItem>
            <SelectItem value="failed">Fallite</SelectItem>
            <SelectItem value="rejected">Rifiutate</SelectItem>
            <SelectItem value="cancelled">Annullate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {data && (
        <DataTable
          columns={columns}
          data={data.data}
          pageCount={data.totalPages || Math.ceil(data.total / filters.limit!)}
          pageSize={filters.limit!}
          pageIndex={(filters.page || 1) - 1}
          onPageChange={(pageIdx) => setFilters((f) => ({ ...f, page: pageIdx + 1 }))}
        />
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Modifica</DialogTitle>
            <DialogDescription>
              Inserisci il motivo del rifiuto. Questa informazione sarà visibile
              all'utente che ha creato la modifica.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo del rifiuto..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading !== null}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Rifiuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modification Modal */}
      {accountId && (
        <CreateModificationModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          accountId={accountId}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = 'bg-primary',
  onClick,
  active,
}: {
  label: string;
  value: number;
  color?: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all ${
        active ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </button>
  );
}
