import type { BaseFilters } from './audit';

export type DecisionStatus = 'draft' | 'approved' | 'exported' | 'applied' | 'rolled_back';

export interface Decision {
  id: string;
  auditId: string;
  accountId: string;
  decisionGroupId: string;
  version: number;
  isCurrent: boolean;
  supersededBy: string | null;
  moduleId: number;
  entityType: string;
  entityId: string;
  entityName: string | null;
  actionType: string;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  rationale: string | null;
  evidence: Record<string, unknown> | null;
  status: DecisionStatus;
  changeSetId: string | null;
  exportedAt: string | null;
  appliedAt: string | null;
  createdById: string;
  createdBy?: {
    id: string;
    email: string;
  };
  createdAt: string;
}

export interface DecisionFilters extends BaseFilters {
  moduleId?: number;
  entityType?: string;
  actionType?: string;
  status?: DecisionStatus;
  currentOnly?: boolean;
}

export interface DecisionSummary {
  total: number;
  byStatus: Record<DecisionStatus, number>;
  byModule: Record<number, number>;
  byEntityType: Record<string, number>;
  byActionType: Record<string, number>;
}

export interface CreateDecisionDto {
  accountId: string;
  moduleId: number;
  entityType: string;
  entityId: string;
  entityName?: string;
  actionType: string;
  beforeValue?: Record<string, unknown>;
  afterValue?: Record<string, unknown>;
  rationale?: string;
  evidence?: Record<string, unknown>;
}

export interface UpdateDecisionDto {
  afterValue?: Record<string, unknown>;
  rationale?: string;
  evidence?: Record<string, unknown>;
}

export type ChangeSetStatus = 'draft' | 'approved' | 'exported' | 'applied';

export interface ChangeSet {
  id: string;
  auditId: string;
  accountId: string;
  name: string;
  description: string | null;
  status: ChangeSetStatus;
  exportFiles: Array<{ filename: string; rows: number }> | null;
  exportHash: string | null;
  createdById: string;
  createdBy?: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  exportedAt: string | null;
  decisions?: Decision[];
  decisionsCount?: number;
}

export interface ChangeSetFilters extends BaseFilters {
  status?: ChangeSetStatus;
}

export interface CreateChangeSetDto {
  accountId: string;
  name: string;
  description?: string;
  decisionIds?: string[];
}

export interface UpdateChangeSetDto {
  name?: string;
  description?: string;
  decisionIds?: string[];
}

export interface ExportPreview {
  files: Array<{
    filename: string;
    rows: number;
    preview: string;
  }>;
}

export const MODULE_NAMES: Record<number, string> = {
  1: 'Obiettivi attivi',
  2: 'Consent Mode',
  3: 'Consigli automatici',
  4: 'Strategia offerta',
  5: 'Preset colonne',
  6: 'Suggerimenti manuali',
  7: 'Gruppi annunci',
  8: 'Preset colonne avanzati',
  9: 'Conversioni totali',
  10: 'KPI principali',
  11: 'Impostazioni campagna',
  12: 'CPA per gruppo',
  13: 'Quote perse GDA',
  14: 'Asset efficacia',
  15: 'Efficacia annunci',
  16: 'Conversioni annuncio',
  17: 'Estensione chiamata',
  18: 'Estensione messaggi',
  19: 'Prestazioni keyword',
  20: 'Quote perse keyword',
  21: 'Coerenza KW-Landing',
  22: 'Termini di ricerca',
  23: 'Keyword negative',
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  campaign: 'Campagna',
  ad_group: 'Gruppo annunci',
  keyword: 'Keyword',
  negative_keyword_campaign: 'Negativa (campagna)',
  negative_keyword_adgroup: 'Negativa (gruppo)',
  ad: 'Annuncio',
  asset: 'Asset',
  sitelink: 'Sitelink',
  call_extension: 'Estensione chiamata',
  search_term: 'Termine di ricerca',
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  PAUSE: 'Pausa',
  ENABLE: 'Attiva',
  REMOVE: 'Rimuovi',
  ADD: 'Aggiungi',
  UPDATE_STATUS: 'Modifica stato',
  UPDATE_BID: 'Modifica offerta',
  UPDATE_BUDGET: 'Modifica budget',
  UPDATE_URL: 'Modifica URL',
  UPDATE_MATCH_TYPE: 'Modifica corrispondenza',
  UPDATE_AD_COPY: 'Modifica copy',
  PROMOTE_TO_KEYWORD: 'Promuovi a keyword',
  ADD_AS_NEGATIVE: 'Aggiungi come negativa',
  ROLLBACK: 'Rollback',
};

export const STATUS_LABELS: Record<DecisionStatus, string> = {
  draft: 'Bozza',
  approved: 'Approvata',
  exported: 'Esportata',
  applied: 'Applicata',
  rolled_back: 'Rollback',
};
