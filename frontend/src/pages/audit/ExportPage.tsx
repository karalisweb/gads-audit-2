import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileDown,
  Plus,
  CheckCircle2,
  Download,
  CheckSquare,
  Trash2,
  Eye,
  FolderArchive,
  Clock,
  FileText,
} from 'lucide-react';
import {
  getChangeSets,
  getExportableDecisions,
  createChangeSet,
  approveChangeSet,
  exportChangeSet,
  downloadChangeSet,
  markChangeSetAsApplied,
  deleteChangeSet,
  getExportPreview,
} from '@/api/decisions';
import type { ChangeSet, ChangeSetStatus, Decision, ExportPreview } from '@/types/decisions';
import {
  ENTITY_TYPE_LABELS,
  ACTION_TYPE_LABELS,
} from '@/types/decisions';

const statusConfig: Record<ChangeSetStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Bozza', color: 'bg-gray-100 text-gray-700', icon: Clock },
  approved: { label: 'Approvato', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  exported: { label: 'Esportato', color: 'bg-green-100 text-green-700', icon: FileDown },
  applied: { label: 'Applicato', color: 'bg-purple-100 text-purple-700', icon: CheckSquare },
};

export function ExportPage() {
  const { accountId } = useParams<{ accountId: string }>();

  const [changeSets, setChangeSets] = useState<ChangeSet[]>([]);
  const [exportableDecisions, setExportableDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create change set dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChangeSetName, setNewChangeSetName] = useState('');
  const [newChangeSetDescription, setNewChangeSetDescription] = useState('');
  const [selectedDecisionIds, setSelectedDecisionIds] = useState<string[]>([]);

  // Preview dialog
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ExportPreview | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteChangeSetId, setDeleteChangeSetId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const [changeSetsResult, exportableResult] = await Promise.all([
        getChangeSets(accountId),
        getExportableDecisions(accountId),
      ]);
      setChangeSets(changeSetsResult.data);
      setExportableDecisions(exportableResult);
    } catch (err) {
      console.error('Failed to load export data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateChangeSet = async () => {
    if (!accountId || !newChangeSetName.trim()) return;

    try {
      await createChangeSet({
        accountId,
        name: newChangeSetName,
        description: newChangeSetDescription || undefined,
        decisionIds: selectedDecisionIds.length > 0 ? selectedDecisionIds : undefined,
      });
      setCreateDialogOpen(false);
      setNewChangeSetName('');
      setNewChangeSetDescription('');
      setSelectedDecisionIds([]);
      await loadData();
    } catch (err) {
      console.error('Failed to create change set:', err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveChangeSet(id);
      await loadData();
    } catch (err) {
      console.error('Failed to approve change set:', err);
    }
  };

  const handleExport = async (id: string) => {
    try {
      await exportChangeSet(id);
      await loadData();
    } catch (err) {
      console.error('Failed to export change set:', err);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await downloadChangeSet(id);
    } catch (err) {
      console.error('Failed to download change set:', err);
    }
  };

  const handleMarkApplied = async (id: string) => {
    try {
      await markChangeSetAsApplied(id);
      await loadData();
    } catch (err) {
      console.error('Failed to mark as applied:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteChangeSetId) return;
    try {
      await deleteChangeSet(deleteChangeSetId);
      setDeleteDialogOpen(false);
      setDeleteChangeSetId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete change set:', err);
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const preview = await getExportPreview(id);
      setPreviewData(preview);
      setPreviewDialogOpen(true);
    } catch (err) {
      console.error('Failed to get preview:', err);
    }
  };

  const toggleDecisionSelection = (id: string) => {
    setSelectedDecisionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllDecisions = () => {
    if (selectedDecisionIds.length === exportableDecisions.length) {
      setSelectedDecisionIds([]);
    } else {
      setSelectedDecisionIds(exportableDecisions.map((d) => d.id));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Centro Export</h2>
          <p className="text-muted-foreground">
            Crea pacchetti di modifiche da esportare per Google Ads Editor
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Change Set
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crea nuovo Change Set</DialogTitle>
              <DialogDescription>
                Seleziona le decisioni da includere nel pacchetto di export
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  placeholder="Es: Ottimizzazione keyword Q1"
                  value={newChangeSetName}
                  onChange={(e) => setNewChangeSetName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrizione (opzionale)</label>
                <Textarea
                  placeholder="Descrivi le modifiche incluse..."
                  value={newChangeSetDescription}
                  onChange={(e) => setNewChangeSetDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Decisioni disponibili ({exportableDecisions.length})
                  </label>
                  <Button variant="ghost" size="sm" onClick={selectAllDecisions}>
                    {selectedDecisionIds.length === exportableDecisions.length
                      ? 'Deseleziona tutte'
                      : 'Seleziona tutte'}
                  </Button>
                </div>
                {exportableDecisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nessuna decisione disponibile per l'export
                  </p>
                ) : (
                  <div className="border rounded-md max-h-64 overflow-y-auto">
                    {exportableDecisions.map((decision) => (
                      <div
                        key={decision.id}
                        className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedDecisionIds.includes(decision.id)}
                          onCheckedChange={() => toggleDecisionSelection(decision.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{decision.entityName || decision.entityId}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>{ENTITY_TYPE_LABELS[decision.entityType] || decision.entityType}</span>
                            <span>•</span>
                            <span>{ACTION_TYPE_LABELS[decision.actionType] || decision.actionType}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          M{String(decision.moduleId).padStart(2, '0')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={handleCreateChangeSet}
                disabled={!newChangeSetName.trim()}
              >
                Crea Change Set
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Decisioni Esportabili</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exportableDecisions.length}</div>
            <p className="text-xs text-muted-foreground">Pronte per l'export</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Change Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{changeSets.length}</div>
            <p className="text-xs text-muted-foreground">Totali creati</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Esportati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {changeSets.filter((cs) => cs.status === 'exported' || cs.status === 'applied').length}
            </div>
            <p className="text-xs text-muted-foreground">Pronti per download</p>
          </CardContent>
        </Card>
      </div>

      {/* Change Sets List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Change Sets</h3>
        {changeSets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderArchive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nessun change set creato. Crea il primo per iniziare!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {changeSets.map((changeSet) => {
              const config = statusConfig[changeSet.status];
              const StatusIcon = config.icon;
              const decisionsCount = changeSet.decisionsCount || changeSet.decisions?.length || 0;

              return (
                <Card key={changeSet.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{changeSet.name}</CardTitle>
                        {changeSet.description && (
                          <CardDescription className="mt-1">{changeSet.description}</CardDescription>
                        )}
                      </div>
                      <Badge className={config.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {decisionsCount} decisioni
                      </div>
                      {changeSet.exportFiles && (
                        <div className="flex items-center gap-1">
                          <FileDown className="h-4 w-4" />
                          {changeSet.exportFiles.length} file CSV
                        </div>
                      )}
                      <div>
                        Creato: {new Date(changeSet.createdAt).toLocaleDateString('it-IT')}
                      </div>
                      {changeSet.exportedAt && (
                        <div>
                          Esportato: {new Date(changeSet.exportedAt).toLocaleDateString('it-IT')}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(changeSet.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Anteprima
                      </Button>

                      {changeSet.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(changeSet.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approva
                        </Button>
                      )}

                      {changeSet.status === 'approved' && (
                        <Button size="sm" onClick={() => handleExport(changeSet.id)}>
                          <FileDown className="h-4 w-4 mr-1" />
                          Esporta
                        </Button>
                      )}

                      {changeSet.status === 'exported' && (
                        <>
                          <Button size="sm" onClick={() => handleDownload(changeSet.id)}>
                            <Download className="h-4 w-4 mr-1" />
                            Download ZIP
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkApplied(changeSet.id)}
                          >
                            <CheckSquare className="h-4 w-4 mr-1" />
                            Segna come applicato
                          </Button>
                        </>
                      )}

                      {changeSet.status !== 'applied' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setDeleteChangeSetId(changeSet.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Anteprima Export</DialogTitle>
            <DialogDescription>
              File CSV che verranno generati
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              {previewData.files.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessun file da generare
                </p>
              ) : (
                previewData.files.map((file) => (
                  <Card key={file.filename}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-mono">{file.filename}</CardTitle>
                        <Badge variant="outline">{file.rows} righe</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                        {file.preview}
                      </pre>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo change set? Le decisioni associate non
              verranno eliminate ma torneranno disponibili per nuovi export.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
