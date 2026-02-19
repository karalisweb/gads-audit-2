export type ModificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'applied'
  | 'failed'
  | 'cancelled';

export type ModificationEntityType =
  | 'campaign'
  | 'ad_group'
  | 'ad'
  | 'keyword'
  | 'negative_keyword'
  | 'conversion_action';

export type ModificationType =
  | 'campaign.budget'
  | 'campaign.status'
  | 'campaign.target_cpa'
  | 'campaign.target_roas'
  | 'ad_group.status'
  | 'ad_group.cpc_bid'
  | 'ad.status'
  | 'ad.headlines'
  | 'ad.descriptions'
  | 'ad.final_url'
  | 'keyword.status'
  | 'keyword.cpc_bid'
  | 'keyword.final_url'
  | 'negative_keyword.add'
  | 'negative_keyword.remove'
  | 'conversion.primary'
  | 'conversion.default_value';

export interface Modification {
  id: string;
  accountId: string;
  entityType: ModificationEntityType;
  entityId: string;
  entityName: string | null;
  modificationType: ModificationType;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown>;
  notes: string | null;
  priority: string | null;
  entityLevel: number | null;
  status: ModificationStatus;
  rejectionReason: string | null;
  appliedAt: string | null;
  resultMessage: string | null;
  resultDetails: Record<string, unknown> | null;
  createdById: string | null;
  createdBy?: {
    id: string;
    email: string;
  };
  approvedById: string | null;
  approvedBy?: {
    id: string;
    email: string;
  };
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModificationFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  entityType?: ModificationEntityType;
  modificationType?: ModificationType;
  status?: ModificationStatus;
  priority?: string;
}

export type ModificationPriority = 'high' | 'medium' | 'low';

export function getPriorityLabel(priority: string | null | undefined): string {
  if (!priority) return '-';
  const labels: Record<string, string> = {
    high: 'Alta',
    medium: 'Media',
    low: 'Bassa',
  };
  return labels[priority] || priority;
}

export function getPriorityColor(priority: string | null | undefined): string {
  if (!priority) return 'bg-gray-100 text-gray-600';
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-600',
  };
  return colors[priority] || 'bg-gray-100 text-gray-600';
}

export interface ModificationSummary {
  total: number;
  byStatus: Record<ModificationStatus, number>;
  byEntityType: Record<ModificationEntityType, number>;
}

export interface CreateModificationDto {
  accountId: string;
  entityType: ModificationEntityType;
  entityId: string;
  entityName?: string;
  modificationType: ModificationType;
  beforeValue?: Record<string, unknown>;
  afterValue: Record<string, unknown>;
  notes?: string;
}

// Helper functions
export function getStatusColor(status: ModificationStatus): string {
  const colors: Record<ModificationStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    processing: 'bg-purple-100 text-purple-800',
    applied: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: ModificationStatus): string {
  const labels: Record<ModificationStatus, string> = {
    pending: 'In Attesa',
    approved: 'Approvata',
    rejected: 'Rifiutata',
    processing: 'In Elaborazione',
    applied: 'Applicata',
    failed: 'Fallita',
    cancelled: 'Annullata',
  };
  return labels[status] || status;
}

export function getModificationTypeLabel(type: ModificationType): string {
  const labels: Record<ModificationType, string> = {
    'campaign.budget': 'Modifica Budget',
    'campaign.status': 'Stato Campagna',
    'campaign.target_cpa': 'Target CPA',
    'campaign.target_roas': 'Target ROAS',
    'ad_group.status': 'Stato Gruppo',
    'ad_group.cpc_bid': 'Bid CPC Gruppo',
    'ad.status': 'Stato Annuncio',
    'ad.headlines': 'Titoli Annuncio',
    'ad.descriptions': 'Descrizioni Annuncio',
    'ad.final_url': 'URL Finale Annuncio',
    'keyword.status': 'Stato Keyword',
    'keyword.cpc_bid': 'Bid CPC Keyword',
    'keyword.final_url': 'URL Finale Keyword',
    'negative_keyword.add': 'Aggiungi Negativa',
    'negative_keyword.remove': 'Rimuovi Negativa',
    'conversion.primary': 'Conversione Primaria',
    'conversion.default_value': 'Valore Default',
  };
  return labels[type] || type;
}

export function getEntityTypeLabel(type: ModificationEntityType): string {
  const labels: Record<ModificationEntityType, string> = {
    campaign: 'Campagna',
    ad_group: 'Gruppo Annunci',
    ad: 'Annuncio',
    keyword: 'Keyword',
    negative_keyword: 'Keyword Negativa',
    conversion_action: 'Azione Conversione',
  };
  return labels[type] || type;
}
