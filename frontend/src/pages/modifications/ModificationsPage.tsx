import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
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
import { Check, X, AlertCircle, Clock, Loader2, Plus, Eye, Code, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { CreateModificationModal } from './CreateModificationModal';
import {
  getModifications,
  getModificationSummary,
  approveModification,
  rejectModification,
  cancelModification,
  bulkApproveModifications,
  bulkRejectModifications,
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

// URL pubblico dello script Google Ads (file statico)
const SCRIPT_URL = '/scripts/google-ads-modifier.js';

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
    if ('targetCpa' in obj) {
      return `CPA €${(Number(obj.targetCpa) / 1000000).toFixed(2)}`;
    }
    if ('targetRoas' in obj) {
      return `ROAS ${Number(obj.targetRoas).toFixed(2)}`;
    }
    if ('status' in obj) {
      return obj.status === 'ENABLED' ? 'Attivo' : obj.status === 'PAUSED' ? 'In pausa' : String(obj.status);
    }
    if ('finalUrl' in obj) {
      return String(obj.finalUrl);
    }
    if ('finalUrls' in obj && Array.isArray(obj.finalUrls)) {
      return `${obj.finalUrls.length} URL`;
    }
    if ('headlines' in obj && Array.isArray(obj.headlines)) {
      return `${obj.headlines.length} titoli`;
    }
    if ('descriptions' in obj && Array.isArray(obj.descriptions)) {
      return `${obj.descriptions.length} descrizioni`;
    }
    if ('keyword' in obj) {
      return String(obj.keyword);
    }
    if ('isPrimary' in obj) {
      return obj.isPrimary ? 'Primaria' : 'Secondaria';
    }
    if ('defaultValue' in obj) {
      return `€${Number(obj.defaultValue).toFixed(2)}`;
    }
    // Fallback: show key count
    const keys = Object.keys(obj);
    if (keys.length <= 2) {
      return keys.map(k => `${k}: ${String(obj[k])}`).join(', ');
    }
    return `${keys.length} valori`;
  }
  return String(value);
}

// Check if value has complex data that needs a detail view
function hasComplexData(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return 'headlines' in obj || 'descriptions' in obj || 'finalUrls' in obj;
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
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModification, setDetailModification] = useState<Modification | null>(null);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRejectDialogOpen, setBulkRejectDialogOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

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

  // Get selected pending modification IDs
  const getSelectedPendingIds = (): string[] => {
    if (!data) return [];
    return Object.keys(rowSelection)
      .filter(idx => rowSelection[idx])
      .map(idx => data.data[parseInt(idx)])
      .filter(mod => mod && mod.status === 'pending')
      .map(mod => mod.id);
  };

  const selectedPendingCount = getSelectedPendingIds().length;
  const selectedCount = Object.keys(rowSelection).filter(idx => rowSelection[idx]).length;

  const handleBulkApprove = async () => {
    const ids = getSelectedPendingIds();
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      await bulkApproveModifications(ids);
      setRowSelection({});
      fetchData();
    } catch (err) {
      console.error('Error bulk approving:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkReject = async () => {
    const ids = getSelectedPendingIds();
    if (ids.length === 0 || !bulkRejectReason.trim()) return;
    setBulkLoading(true);
    try {
      await bulkRejectModifications(ids, bulkRejectReason);
      setRowSelection({});
      setBulkRejectDialogOpen(false);
      setBulkRejectReason('');
      fetchData();
    } catch (err) {
      console.error('Error bulk rejecting:', err);
    } finally {
      setBulkLoading(false);
    }
  };

  const columns: ColumnDef<Modification>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 accent-primary"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 accent-primary"
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
    },
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
      size: 200,
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <p className="font-medium break-words whitespace-normal">
            {row.original.entityName || row.original.entityId}
          </p>
          <p className="text-xs text-muted-foreground break-all">
            ID: {row.original.entityId}
          </p>
        </div>
      ),
    },
    {
      id: 'change',
      header: 'Modifica',
      size: 320,
      cell: ({ row }) => {
        const showDetailBtn = hasComplexData(row.original.beforeValue) || hasComplexData(row.original.afterValue);
        return (
          <div className="text-sm max-w-[320px]">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">Da:</span>
              <span className="break-words whitespace-normal">{formatValue(row.original.beforeValue)}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">A:</span>
              <span className="font-medium text-primary break-words whitespace-normal">
                {formatValue(row.original.afterValue)}
              </span>
              {showDetailBtn && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setDetailModification(row.original);
                    setDetailModalOpen(true);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Dettagli
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdBy',
      header: 'Creata da',
      size: 140,
      cell: ({ row }) => (
        <div className="max-w-[140px]">
          <p className="text-sm break-words whitespace-normal">{row.original.createdBy?.email || 'Analisi automatica'}</p>
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
            <div className="text-sm text-red-600">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              <span className="break-words">{mod.resultMessage || 'Errore'}</span>
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setScriptModalOpen(true)}>
            <Code className="h-4 w-4 mr-2" />
            Script Google Ads
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Modifica
          </Button>
        </div>
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

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 border rounded-lg">
          <span className="text-sm font-medium">
            {selectedCount} selezionat{selectedCount === 1 ? 'a' : 'e'}
            {selectedPendingCount < selectedCount && (
              <span className="text-muted-foreground"> ({selectedPendingCount} in attesa)</span>
            )}
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={handleBulkApprove}
              disabled={bulkLoading || selectedPendingCount === 0}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Approva ({selectedPendingCount})
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50"
              onClick={() => setBulkRejectDialogOpen(true)}
              disabled={bulkLoading || selectedPendingCount === 0}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rifiuta ({selectedPendingCount})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRowSelection({})}
            >
              Deseleziona
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      {data && (
        <DataTable
          columns={columns}
          data={data.data}
          pageCount={data.meta?.totalPages || Math.ceil((data.meta?.total || 0) / filters.limit!)}
          pageSize={filters.limit!}
          pageIndex={(filters.page || 1) - 1}
          total={data.meta?.total || 0}
          onPageChange={(pageIdx) => setFilters((f) => ({ ...f, page: pageIdx + 1 }))}
          enableRowSelection={(row) => row.original.status === 'pending'}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
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

      {/* Bulk Reject Dialog */}
      <Dialog open={bulkRejectDialogOpen} onOpenChange={setBulkRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta {selectedPendingCount} Modifiche</DialogTitle>
            <DialogDescription>
              Inserisci il motivo del rifiuto per tutte le modifiche selezionate.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo del rifiuto..."
              value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkRejectDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={!bulkRejectReason.trim() || bulkLoading}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Rifiuta {selectedPendingCount} modifiche
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

      {/* Detail Modal for complex modifications */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Dettagli Modifica</DialogTitle>
            <DialogDescription>
              {detailModification?.entityName || detailModification?.entityId} - {detailModification && getModificationTypeLabel(detailModification.modificationType)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {detailModification && (
              <>
                {/* Before Value */}
                {detailModification.beforeValue && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">Valore Precedente</h4>
                    <ModificationValueDisplay value={detailModification.beforeValue} />
                  </div>
                )}
                {/* After Value */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-primary">Nuovo Valore</h4>
                  <ModificationValueDisplay value={detailModification.afterValue} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Script Modal */}
      <Dialog open={scriptModalOpen} onOpenChange={setScriptModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Script Google Ads</DialogTitle>
            <DialogDescription>
              Configura lo script una sola volta per eseguire automaticamente le modifiche approvate
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <h4 className="font-medium">Setup iniziale (una tantum):</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Vai su Google Ads {'>'} Strumenti e impostazioni {'>'} Script</li>
                <li>Clicca su <strong>+</strong> per creare un nuovo script</li>
                <li>Apri lo script dal link qui sotto e copia tutto il codice</li>
                <li>Incolla il codice nello script Google Ads</li>
                <li>Sostituisci <code className="bg-muted px-1 rounded">IL_TUO_SHARED_SECRET_QUI</code> con lo Shared Secret dell'account</li>
                <li>Autorizza lo script quando richiesto</li>
                <li>Imposta una schedulazione (es. ogni ora, ogni giorno)</li>
              </ol>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Link allo script:</p>
              <a
                href={SCRIPT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-2 text-sm break-all"
              >
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                {window.location.origin}{SCRIPT_URL}
              </a>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>Come funziona:</strong> Una volta configurato, lo script gira automaticamente secondo la schedulazione impostata.
                Legge le modifiche "Approvate", le esegue su Google Ads, e aggiorna lo stato nel sistema.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Nota:</strong> Lo script deve essere configurato una sola volta.
                Dopo il setup, tutte le modifiche approvate verranno eseguite automaticamente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScriptModalOpen(false)}>
              Chiudi
            </Button>
            <Button asChild>
              <a href={SCRIPT_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Apri Script
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component to display modification values nicely
function ModificationValueDisplay({ value }: { value: Record<string, unknown> }) {
  // Headlines
  if ('headlines' in value && Array.isArray(value.headlines)) {
    const headlines = value.headlines as { text: string; pinnedField?: string | null }[];
    return (
      <div className="rounded-md bg-muted p-3 space-y-1">
        {headlines.map((h, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground w-5">{i + 1}.</span>
            <span className="flex-1">{h.text}</span>
            {h.pinnedField && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                Pin {h.pinnedField.replace('HEADLINE_', '')}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Descriptions
  if ('descriptions' in value && Array.isArray(value.descriptions)) {
    const descriptions = value.descriptions as { text: string; pinnedField?: string | null }[];
    return (
      <div className="rounded-md bg-muted p-3 space-y-2">
        {descriptions.map((d, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground w-5">{i + 1}.</span>
            <span className="flex-1">{d.text}</span>
            {d.pinnedField && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                Pin {d.pinnedField.replace('DESCRIPTION_', '')}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Final URLs
  if ('finalUrls' in value && Array.isArray(value.finalUrls)) {
    return (
      <div className="rounded-md bg-muted p-3 space-y-1">
        {(value.finalUrls as string[]).map((url, i) => (
          <div key={i} className="text-sm break-all">
            <span className="text-muted-foreground">{i + 1}.</span> {url}
          </div>
        ))}
      </div>
    );
  }

  // Generic display
  return (
    <div className="rounded-md bg-muted p-3 space-y-1">
      {Object.entries(value).map(([key, val]) => (
        <div key={key} className="text-sm">
          <span className="text-muted-foreground">{key}:</span>{' '}
          <span className="font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
        </div>
      ))}
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
