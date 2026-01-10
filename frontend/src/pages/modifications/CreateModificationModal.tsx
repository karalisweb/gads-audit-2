import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
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
  keyword: ['keyword.status', 'keyword.cpc_bid'],
  negative_keyword: ['negative_keyword.add', 'negative_keyword.remove'],
  conversion_action: ['conversion.primary', 'conversion.default_value'],
};

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
      default:
        return { value: newValue };
    }
  };

  const handleSubmit = async () => {
    if (!entityType || !entityId || !modificationType || !newValue) {
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuova Modifica Google Ads</DialogTitle>
          <DialogDescription>
            Crea una nuova richiesta di modifica. Sarà applicata dallo script
            Google Ads dopo l'approvazione.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {/* Current Value Display */}
          {currentValue && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm text-muted-foreground">Valore attuale:</p>
              <p className="text-sm font-medium">
                {JSON.stringify(currentValue)}
              </p>
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

        <DialogFooter>
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
