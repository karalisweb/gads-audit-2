import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';
import { CreateModificationModal } from '@/pages/modifications/CreateModificationModal';
import type { ModificationEntityType, ModificationType } from '@/types';

interface ModifyButtonProps {
  accountId: string;
  entityType: ModificationEntityType;
  entityId: string;
  entityName?: string;
  currentValue?: Record<string, unknown>;
  onSuccess?: () => void;
  // Optional: pre-select a specific modification type
  modificationType?: ModificationType;
}

// Map entity types to available actions
const actionLabels: Record<ModificationEntityType, { type: ModificationType; label: string }[]> = {
  campaign: [
    { type: 'campaign.budget', label: 'Modifica Budget' },
    { type: 'campaign.status', label: 'Cambia Stato' },
    { type: 'campaign.target_cpa', label: 'Imposta Target CPA' },
    { type: 'campaign.target_roas', label: 'Imposta Target ROAS' },
  ],
  ad_group: [
    { type: 'ad_group.status', label: 'Cambia Stato' },
    { type: 'ad_group.cpc_bid', label: 'Modifica Bid CPC' },
  ],
  ad: [
    { type: 'ad.status', label: 'Cambia Stato' },
    { type: 'ad.headlines', label: 'Modifica Titoli' },
    { type: 'ad.descriptions', label: 'Modifica Descrizioni' },
    { type: 'ad.final_url', label: 'Modifica URL Finale' },
  ],
  keyword: [
    { type: 'keyword.status', label: 'Cambia Stato' },
    { type: 'keyword.cpc_bid', label: 'Modifica Bid CPC' },
    { type: 'keyword.final_url', label: 'Modifica URL Finale' },
  ],
  negative_keyword: [
    { type: 'negative_keyword.add', label: 'Aggiungi Negativa' },
    { type: 'negative_keyword.remove', label: 'Rimuovi Negativa' },
  ],
  conversion_action: [
    { type: 'conversion.primary', label: 'Imposta Primaria/Secondaria' },
    { type: 'conversion.default_value', label: 'Modifica Valore Default' },
  ],
};

export function ModifyButton({
  accountId,
  entityType,
  entityId,
  entityName,
  currentValue,
  onSuccess,
}: ModifyButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedModType, setSelectedModType] = useState<ModificationType | undefined>();

  const actions = actionLabels[entityType] || [];

  const handleActionClick = (modType: ModificationType) => {
    setSelectedModType(modType);
    setModalOpen(true);
  };

  if (actions.length === 0) return null;

  // If only one action, show a simple button
  if (actions.length === 1) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleActionClick(actions[0].type)}
          title={actions[0].label}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
        <CreateModificationModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          accountId={accountId}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          modificationType={selectedModType}
          currentValue={currentValue}
          onSuccess={onSuccess}
        />
      </>
    );
  }

  // Multiple actions: show dropdown
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Modifica</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.type}
              onClick={() => handleActionClick(action.type)}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateModificationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        accountId={accountId}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        modificationType={selectedModType}
        currentValue={currentValue}
        onSuccess={onSuccess}
      />
    </>
  );
}
