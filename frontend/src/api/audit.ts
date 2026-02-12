import { apiClient } from './client';
import type {
  GoogleAdsAccount,
  ImportRun,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  SearchTerm,
  NegativeKeyword,
  Asset,
  ConversionAction,
  KpiData,
  PaginatedResponse,
  CampaignFilters,
  AdGroupFilters,
  KeywordFilters,
  SearchTermFilters,
  AssetFilters,
  AdFilters,
  NegativeKeywordFilters,
  ConversionActionFilters,
} from '@/types/audit';

// Helper to build query params
function buildParams(filters: Record<string, unknown>): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        params[key] = value.join(',');
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        params[key] = value;
      }
    }
  });
  return params;
}

// Accounts
export async function getAccounts(): Promise<GoogleAdsAccount[]> {
  return apiClient.get<GoogleAdsAccount[]>('/audit/accounts');
}

export interface AccountStats {
  cost: number;
  cpa: number;
  conversions: number;
  impressions: number;
  clicks: number;
  ctr: number;
  roas: number;
  urgentIssues: number;
  totalCampaigns: number;
  activeCampaigns: number;
}

export interface AccountTrends {
  cost: number;
  conversions: number;
  cpa: number;
  ctr: number;
  impressions: number;
}

export interface AccountWithStats extends GoogleAdsAccount {
  stats: AccountStats | null;
  healthScore: number | null;
  trends: AccountTrends | null;
  lastImportDate: string | null;
  lastModificationDate: string | null;
}

export async function getAccountsWithStats(): Promise<AccountWithStats[]> {
  return apiClient.get<AccountWithStats[]>('/audit/accounts-with-stats');
}

export async function getAccount(accountId: string): Promise<GoogleAdsAccount> {
  return apiClient.get<GoogleAdsAccount>(`/audit/accounts/${accountId}`);
}

// Import Runs
export async function getImportRuns(accountId: string): Promise<ImportRun[]> {
  return apiClient.get<ImportRun[]>(`/audit/accounts/${accountId}/runs`);
}

export async function getLatestRun(accountId: string): Promise<ImportRun | null> {
  return apiClient.get<ImportRun | null>(`/audit/accounts/${accountId}/runs/latest`);
}

// KPIs
export async function getKpis(accountId: string, runId?: string): Promise<KpiData | null> {
  const params = runId ? { runId } : undefined;
  return apiClient.get<KpiData | null>(`/audit/accounts/${accountId}/kpis`, params);
}

// Health Score
export interface HealthScoreBreakdownItem {
  score: number;
  max: number;
  detail: string;
}

export interface HealthScoreResult {
  score: number;
  breakdown: {
    qualityScore: HealthScoreBreakdownItem;
    wastedSpend: HealthScoreBreakdownItem;
    negativeCoverage: HealthScoreBreakdownItem;
    impressionShare: HealthScoreBreakdownItem;
    accountStructure: HealthScoreBreakdownItem;
    issueSeverity: HealthScoreBreakdownItem;
  };
}

export async function getHealthScore(accountId: string, runId?: string): Promise<HealthScoreResult> {
  const params = runId ? { runId } : undefined;
  return apiClient.get<HealthScoreResult>(`/audit/accounts/${accountId}/health-score`, params);
}

// Campaigns
export async function getCampaigns(
  accountId: string,
  filters: CampaignFilters = {},
): Promise<PaginatedResponse<Campaign>> {
  const params = buildParams(filters as Record<string, unknown>);
  return apiClient.get<PaginatedResponse<Campaign>>(`/audit/accounts/${accountId}/campaigns`, params);
}

// Ad Groups
export async function getAdGroups(
  accountId: string,
  filters: AdGroupFilters = {},
): Promise<PaginatedResponse<AdGroup>> {
  const params = buildParams(filters as Record<string, unknown>);
  return apiClient.get<PaginatedResponse<AdGroup>>(`/audit/accounts/${accountId}/ad-groups`, params);
}

// Ads
export async function getAds(
  accountId: string,
  filters: AdFilters = {},
): Promise<PaginatedResponse<Ad>> {
  const params = buildParams(filters as Record<string, unknown>);
  return apiClient.get<PaginatedResponse<Ad>>(`/audit/accounts/${accountId}/ads`, params);
}

// Keywords
export async function getKeywords(
  accountId: string,
  filters: KeywordFilters = {},
): Promise<PaginatedResponse<Keyword>> {
  const params = buildParams(filters as Record<string, unknown>);
  return apiClient.get<PaginatedResponse<Keyword>>(`/audit/accounts/${accountId}/keywords`, params);
}

// Search Terms
export async function getSearchTerms(
  accountId: string,
  filters: SearchTermFilters = {},
): Promise<PaginatedResponse<SearchTerm>> {
  const params = buildParams(filters as Record<string, unknown>);
  return apiClient.get<PaginatedResponse<SearchTerm>>(`/audit/accounts/${accountId}/search-terms`, params);
}

// Negative Keywords
export async function getNegativeKeywords(
  accountId: string,
  filters: NegativeKeywordFilters = {},
): Promise<PaginatedResponse<NegativeKeyword>> {
  const params = buildParams(filters as Record<string, unknown>);
  return apiClient.get<PaginatedResponse<NegativeKeyword>>(`/audit/accounts/${accountId}/negative-keywords`, params);
}

// Assets
export async function getAssets(
  accountId: string,
  filters: AssetFilters = {},
): Promise<PaginatedResponse<Asset>> {
  const params = buildParams(filters as Record<string, unknown>);
  return apiClient.get<PaginatedResponse<Asset>>(`/audit/accounts/${accountId}/assets`, params);
}

// Conversion Actions
export async function getConversionActions(
  accountId: string,
  filters: ConversionActionFilters = {},
): Promise<PaginatedResponse<ConversionAction>> {
  const params = buildParams(filters as Record<string, unknown>);
  return apiClient.get<PaginatedResponse<ConversionAction>>(`/audit/accounts/${accountId}/conversion-actions`, params);
}

// Issues Summary
export interface IssueSummary {
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  byCategory: {
    performance: number;
    quality: number;
    structure: number;
    budget: number;
    targeting: number;
    conversion: number;
    opportunity: number;
  };
  potentialSavings: number;
}

export async function getIssueSummary(accountId: string, runId?: string): Promise<IssueSummary> {
  const params = runId ? { runId } : undefined;
  return apiClient.get<IssueSummary>(`/audit/accounts/${accountId}/issues/summary`, params);
}
