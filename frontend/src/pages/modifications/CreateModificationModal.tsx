import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X, GripVertical } from 'lucide-react';
import { createModification } from '@/api/modifications';
import type {
  ModificationEntityType,
  ModificationType,
  CreateModificationDto,
} from '@/types';
import { getModificationTypeLabel } from '@/types/modification';

interface CreateModificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  // Pre-filled values when opening from entity table
  entityType?: ModificationEntityType;
  entityId?: string;
  entityName?: string;
  modificationType?: ModificationType;
  currentValue?: Record<string, unknown>;
  onSuccess?: () => void;
}

// Map entity types to their available modification types
const modificationTypesByEntity: Record<ModificationEntityType, ModificationType[]> = {
  campaign: ['campaign.budget', 'campaign.status', 'campaign.target_cpa', 'campaign.target_roas'],
  ad_group: ['ad_group.status', 'ad_group.cpc_bid'],
  ad: ['ad.status', 'ad.headlines', 'ad.descriptions', 'ad.final_url'],
  keyword: ['keyword.status', 'keyword.cpc_bid', 'keyword.final_url'],
  negative_keyword: ['negative_keyword.add', 'negative_keyword.remove'],
  conversion_action: ['conversion.primary', 'conversion.default_value'],
};

// RSA Ad headline/description item
interface AdTextItem {
  text: string;
  pinnedField: string | null;
}

// Pin position options
const pinPositions = [
  { value: 'null', label: 'Nessun pin' },
  { value: 'HEADLINE_1', label: 'Posizione 1' },
  { value: 'HEADLINE_2', label: 'Posizione 2' },
  { value: 'HEADLINE_3', label: 'Posizione 3' },
];

const descriptionPinPositions = [
  { value: 'null', label: 'Nessun pin' },
  { value: 'DESCRIPTION_1', label: 'Posizione 1' },
  { value: 'DESCRIPTION_2', label: 'Posizione 2' },
];

export function CreateModificationModal({
  open,
  onOpenChange,
  accountId,
  entityType: initialEntityType,
  entityId: initialEntityId,
  entityName: initialEntityName,
  modificationType: initialModificationType,
  currentValue,
  onSuccess,
}: CreateModificationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [entityType, setEntityType] = useState<ModificationEntityType | ''>(
    initialEntityType || '',
  );
  const [entityId, setEntityId] = useState(initialEntityId || '');
  const [entityName, setEntityName] = useState(initialEntityName || '');
  const [modificationType, setModificationType] = useState<ModificationType | ''>(
    initialModificationType || '',
  );
  const [newValue, setNewValue] = useState('');
  const [notes, setNotes] = useState('');

  // State for RSA ad editing
  const [headlines, setHeadlines] = useState<AdTextItem[]>([]);
  const [descriptions, setDescriptions] = useState<AdTextItem[]>([]);
  const [finalUrls, setFinalUrls] = useState<string[]>(['']);

  // Initialize RSA fields from currentValue when opening for ad modifications
  useEffect(() => {
    if (open && currentValue && entityType === 'ad') {
      // Initialize headlines from currentValue
      if (currentValue.headlines && Array.isArray(currentValue.headlines)) {
        setHeadlines(
          (currentValue.headlines as { text: string; pinnedField?: string | null }[]).map((h) => ({
            text: h.text,
            pinnedField: h.pinnedField || null,
          }))
        );
      }
      // Initialize descriptions from currentValue
      if (currentValue.descriptions && Array.isArray(currentValue.descriptions)) {
        setDescriptions(
          (currentValue.descriptions as { text: string; pinnedField?: string | null }[]).map((d) => ({
            text: d.text,
            pinnedField: d.pinnedField || null,
          }))
        );
      }
      // Initialize finalUrls from currentValue
      if (currentValue.finalUrls && Array.isArray(currentValue.finalUrls)) {
        setFinalUrls(currentValue.finalUrls as string[]);
      }
    }
  }, [open, currentValue, entityType]);

  // Reset form when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setEntityType(initialEntityType || '');
      setEntityId(initialEntityId || '');
      setEntityName(initialEntityName || '');
      setModificationType(initialModificationType || '');
      setNewValue('');
      setNotes('');
      setError(null);
      // Reset RSA fields
      setHeadlines([]);
      setDescriptions([]);
      setFinalUrls(['']);
    }
    onOpenChange(isOpen);
  };

  // Build afterValue based on modification type
  const buildAfterValue = (): Record<string, unknown> => {
    switch (modificationType) {
      case 'campaign.budget':
        // Convert euros to micros
        return { budget: Math.round(parseFloat(newValue) * 1000000) };
      case 'campaign.status':
      case 'ad_group.status':
      case 'keyword.status':
        return { status: newValue };
      case 'campaign.target_cpa':
        return { targetCpa: Math.round(parseFloat(newValue) * 1000000) };
      case 'campaign.target_roas':
        return { targetRoas: parseFloat(newValue) };
      case 'ad_group.cpc_bid':
      case 'keyword.cpc_bid':
        return { cpcBid: Math.round(parseFloat(newValue) * 1000000) };
      case 'negative_keyword.add':
        return { keyword: newValue, matchType: 'EXACT' };
      case 'negative_keyword.remove':
        return { keyword: newValue };
      case 'conversion.primary':
        return { isPrimary: newValue === 'true' };
      case 'conversion.default_value':
        return { defaultValue: parseFloat(newValue) };
      case 'ad.headlines':
        return {
          headlines: headlines.map((h) => ({
            text: h.text,
            pinnedField: h.pinnedField,
          })),
        };
      case 'ad.descriptions':
        return {
          descriptions: descriptions.map((d) => ({
            text: d.text,
            pinnedField: d.pinnedField,
          })),
        };
      case 'ad.final_url':
        return { finalUrls: finalUrls.filter((url) => url.trim() !== '') };
      case 'keyword.final_url':
        return { finalUrl: newValue.trim() };
      default:
        return { value: newValue };
    }
  };

  const handleSubmit = async () => {
    if (!entityType || !entityId || !modificationType) {
      setError('Compila tutti i campi obbligatori');
      return;
    }

    // Validation for RSA ad fields
    if (modificationType === 'ad.headlines') {
      const validHeadlines = headlines.filter((h) => h.text.trim() !== '');
      if (validHeadlines.length < 3) {
        setError('Inserisci almeno 3 titoli');
        return;
      }
      if (validHeadlines.length > 15) {
        setError('Puoi inserire massimo 15 titoli');
        return;
      }
    } else if (modificationType === 'ad.descriptions') {
      const validDescriptions = descriptions.filter((d) => d.text.trim() !== '');
      if (validDescriptions.length < 2) {
        setError('Inserisci almeno 2 descrizioni');
        return;
      }
      if (validDescriptions.length > 4) {
        setError('Puoi inserire massimo 4 descrizioni');
        return;
      }
    } else if (modificationType === 'ad.final_url') {
      const validUrls = finalUrls.filter((url) => url.trim() !== '');
      if (validUrls.length === 0) {
        setError('Inserisci almeno un URL finale');
        return;
      }
    } else if (!newValue) {
      setError('Compila tutti i campi obbligatori');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const dto: CreateModificationDto = {
        accountId,
        entityType,
        entityId,
        entityName: entityName || undefined,
        modificationType,
        beforeValue: currentValue,
        afterValue: buildAfterValue(),
        notes: notes || undefined,
      };

      await createModification(dto);
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error creating modification:', err);
      setError('Errore durante la creazione della modifica');
    } finally {
      setIsLoading(false);
    }
  };

  // Render value input based on modification type
  const renderValueInput = () => {
    switch (modificationType) {
      case 'campaign.budget':
      case 'campaign.target_cpa':
      case 'ad_group.cpc_bid':
      case 'keyword.cpc_bid':
        return (
          <div className="space-y-2">
            <Label htmlFor="newValue">Nuovo valore (€)</Label>
            <Input
              id="newValue"
              type="number"
              step="0.01"
              min="0"
              placeholder="es. 50.00"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
        );
      case 'campaign.target_roas':
        return (
          <div className="space-y-2">
            <Label htmlFor="newValue">Target ROAS</Label>
            <Input
              id="newValue"
              type="number"
              step="0.01"
              min="0"
              placeholder="es. 3.5 (350%)"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
        );
      case 'campaign.status':
      case 'ad_group.status':
      case 'keyword.status':
        return (
          <div className="space-y-2">
            <Label htmlFor="newValue">Nuovo stato</Label>
            <Select value={newValue} onValueChange={setNewValue}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENABLED">Attivo</SelectItem>
                <SelectItem value="PAUSED">In pausa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'conversion.primary':
        return (
          <div className="space-y-2">
            <Label htmlFor="newValue">Conversione primaria?</Label>
            <Select value={newValue} onValueChange={setNewValue}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sì (Primaria)</SelectItem>
                <SelectItem value="false">No (Secondaria)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case 'conversion.default_value':
        return (
          <div className="space-y-2">
            <Label htmlFor="newValue">Valore default (€)</Label>
            <Input
              id="newValue"
              type="number"
              step="0.01"
              min="0"
              placeholder="es. 25.00"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
        );
      case 'negative_keyword.add':
      case 'negative_keyword.remove':
        return (
          <div className="space-y-2">
            <Label htmlFor="newValue">Keyword</Label>
            <Input
              id="newValue"
              type="text"
              placeholder="es. gratis"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
        );
      case 'keyword.final_url':
        return (
          <div className="space-y-2">
            <Label htmlFor="newValue">URL Finale</Label>
            <Input
              id="newValue"
              type="url"
              placeholder="https://esempio.com/pagina"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              L'URL di destinazione specifico per questa keyword
            </p>
          </div>
        );
      case 'ad.headlines':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Titoli (3-15 titoli, max 30 caratteri)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setHeadlines([...headlines, { text: '', pinnedField: null }])
                }
                disabled={headlines.length >= 15}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {headlines.map((headline, index) => (
                <div key={index} className="flex items-center gap-2 group">
                  <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                  <div className="flex-1 flex gap-2">
                    <Input
                      value={headline.text}
                      onChange={(e) => {
                        const newHeadlines = [...headlines];
                        newHeadlines[index].text = e.target.value;
                        setHeadlines(newHeadlines);
                      }}
                      placeholder={`Titolo ${index + 1}`}
                      maxLength={30}
                      className="flex-1"
                    />
                    <Select
                      value={headline.pinnedField || 'null'}
                      onValueChange={(v) => {
                        const newHeadlines = [...headlines];
                        newHeadlines[index].pinnedField = v === 'null' ? null : v;
                        setHeadlines(newHeadlines);
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Pin" />
                      </SelectTrigger>
                      <SelectContent>
                        {pinPositions.map((pos) => (
                          <SelectItem key={pos.value} value={pos.value}>
                            {pos.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setHeadlines(headlines.filter((_, i) => i !== index));
                    }}
                    className="opacity-50 hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {headlines.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun titolo. Clicca "Aggiungi" per iniziare.
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {headlines.filter((h) => h.text.trim()).length}/15 titoli inseriti
            </p>
          </div>
        );
      case 'ad.descriptions':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Descrizioni (2-4, max 90 caratteri)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDescriptions([...descriptions, { text: '', pinnedField: null }])
                }
                disabled={descriptions.length >= 4}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {descriptions.map((description, index) => (
                <div key={index} className="flex items-center gap-2 group">
                  <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      value={description.text}
                      onChange={(e) => {
                        const newDescriptions = [...descriptions];
                        newDescriptions[index].text = e.target.value;
                        setDescriptions(newDescriptions);
                      }}
                      placeholder={`Descrizione ${index + 1}`}
                      maxLength={90}
                      className="flex-1 min-h-[60px]"
                      rows={2}
                    />
                    <Select
                      value={description.pinnedField || 'null'}
                      onValueChange={(v) => {
                        const newDescriptions = [...descriptions];
                        newDescriptions[index].pinnedField = v === 'null' ? null : v;
                        setDescriptions(newDescriptions);
                      }}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Pin" />
                      </SelectTrigger>
                      <SelectContent>
                        {descriptionPinPositions.map((pos) => (
                          <SelectItem key={pos.value} value={pos.value}>
                            {pos.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDescriptions(descriptions.filter((_, i) => i !== index));
                    }}
                    className="opacity-50 hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {descriptions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna descrizione. Clicca "Aggiungi" per iniziare.
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {descriptions.filter((d) => d.text.trim()).length}/4 descrizioni inserite
            </p>
          </div>
        );
      case 'ad.final_url':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>URL Finali</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFinalUrls([...finalUrls, ''])}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </div>
            <div className="space-y-2">
              {finalUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={url}
                    onChange={(e) => {
                      const newUrls = [...finalUrls];
                      newUrls[index] = e.target.value;
                      setFinalUrls(newUrls);
                    }}
                    placeholder="https://esempio.com/pagina"
                    type="url"
                    className="flex-1"
                  />
                  {finalUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFinalUrls(finalUrls.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            <Label htmlFor="newValue">Nuovo valore</Label>
            <Input
              id="newValue"
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
        );
    }
  };

  const availableModTypes = entityType
    ? modificationTypesByEntity[entityType]
    : [];

  // Use wider modal for ad modifications
  const isAdModification = modificationType === 'ad.headlines' || modificationType === 'ad.descriptions';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${isAdModification ? "sm:max-w-[650px]" : "sm:max-w-[500px]"} max-h-[85vh] flex flex-col`}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Nuova Modifica Google Ads</DialogTitle>
          <DialogDescription>
            Crea una nuova richiesta di modifica. Sarà applicata dallo script
            Google Ads dopo l'approvazione.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* Entity Type */}
          <div className="space-y-2">
            <Label htmlFor="entityType">Tipo entità *</Label>
            <Select
              value={entityType}
              onValueChange={(v) => {
                setEntityType(v as ModificationEntityType);
                setModificationType('');
              }}
              disabled={!!initialEntityType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="campaign">Campagna</SelectItem>
                <SelectItem value="ad_group">Gruppo Annunci</SelectItem>
                <SelectItem value="ad">Annuncio</SelectItem>
                <SelectItem value="keyword">Keyword</SelectItem>
                <SelectItem value="negative_keyword">Keyword Negativa</SelectItem>
                <SelectItem value="conversion_action">
                  Azione Conversione
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entity ID */}
          <div className="space-y-2">
            <Label htmlFor="entityId">ID Entità *</Label>
            <Input
              id="entityId"
              placeholder="es. 12345678900"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              disabled={!!initialEntityId}
            />
          </div>

          {/* Entity Name */}
          <div className="space-y-2">
            <Label htmlFor="entityName">Nome Entità</Label>
            <Input
              id="entityName"
              placeholder="es. Campagna Brand"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              disabled={!!initialEntityName}
            />
          </div>

          {/* Modification Type */}
          {entityType && (
            <div className="space-y-2">
              <Label htmlFor="modificationType">Tipo modifica *</Label>
              <Select
                value={modificationType}
                onValueChange={(v) => {
                  setModificationType(v as ModificationType);
                  setNewValue('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona modifica" />
                </SelectTrigger>
                <SelectContent>
                  {availableModTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getModificationTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Value Input - Dynamic based on type */}
          {modificationType && renderValueInput()}

          {/* Current Value Display - formatted for ads */}
          {currentValue && entityType === 'ad' && (modificationType === 'ad.headlines' || modificationType === 'ad.descriptions') && (() => {
            const headlinesArray = currentValue.headlines as { text: string; pinnedField?: string | null }[] | undefined;
            const descriptionsArray = currentValue.descriptions as { text: string; pinnedField?: string | null }[] | undefined;
            return (
              <div className="rounded-md bg-muted p-3 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Valore attuale:</p>
                {modificationType === 'ad.headlines' && headlinesArray && Array.isArray(headlinesArray) && (
                  <div className="space-y-1">
                    {headlinesArray.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-4">{i + 1}.</span>
                        <span className="flex-1">{h.text}</span>
                        {h.pinnedField && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Pin {h.pinnedField.replace('HEADLINE_', '')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {modificationType === 'ad.descriptions' && descriptionsArray && Array.isArray(descriptionsArray) && (
                  <div className="space-y-1">
                    {descriptionsArray.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground w-4">{i + 1}.</span>
                        <span className="flex-1">{d.text}</span>
                        {d.pinnedField && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                            Pin {d.pinnedField.replace('DESCRIPTION_', '')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
          {/* Current Value Display - generic for other types */}
          {currentValue && !(entityType === 'ad' && (modificationType === 'ad.headlines' || modificationType === 'ad.descriptions')) && (
            <div className="rounded-md bg-muted p-3 space-y-1">
              <p className="text-sm text-muted-foreground">Valore attuale:</p>
              <div className="text-sm space-y-0.5">
                {Object.entries(currentValue).map(([key, value]) => (
                  <div key={key} className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Textarea
              id="notes"
              placeholder="Motivazione o note aggiuntive..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Crea Modifica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
