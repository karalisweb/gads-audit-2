// API Response types

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GoogleAdsAccount {
  id: string;
  customerId: string;
  customerName: string;
  currencyCode: string;
  timeZone: string;
  isActive: boolean;
  createdAt: string;
  scheduleEnabled: boolean;
  scheduleDays: number[];
  scheduleTime: string;
  scheduleFrequency: 'weekly' | 'biweekly' | 'monthly';
}

export interface ImportRun {
  id: string;
  runId: string;
  accountId: string;
  status: 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  datasetsExpected: number;
  datasetsReceived: number;
  totalRows: number;
  errorMessage: string | null;
}

export interface Campaign {
  id: string;
  accountId: string;
  runId: string;
  campaignId: string;
  campaignName: string;
  status: string;
  advertisingChannelType: string;
  biddingStrategyType: string;
  targetCpaMicros: string | null;
  targetRoas: string | null;
  budgetMicros: string | null;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  conversionsValue: string;
  ctr: string;
  averageCpcMicros: string;
  searchImpressionShare: string | null;
  searchImpressionShareLostRank: string | null;
  searchImpressionShareLostBudget: string | null;
  searchTopImpressionShare: string | null;
  searchAbsoluteTopImpressionShare: string | null;
  topImpressionPercentage: string | null;
  absoluteTopImpressionPercentage: string | null;
  phoneCalls: number;
  phoneImpressions: number;
  messageChats: number;
  messageImpressions: number;
  dataDateStart: string | null;
  dataDateEnd: string | null;
}

export interface AdGroup {
  id: string;
  accountId: string;
  runId: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  type: string;
  cpcBidMicros: string | null;
  targetCpaMicros: string | null;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  conversionsValue: string;
  ctr: string;
  averageCpcMicros: string;
  searchImpressionShare: string | null;
  searchImpressionShareLostRank: string | null;
  searchImpressionShareLostBudget: string | null;
  phoneCalls: number;
  messageChats: number;
}

export interface Ad {
  id: string;
  accountId: string;
  runId: string;
  adId: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  adType: string;
  status: string;
  approvalStatus: string;
  adStrength: string;
  headlines: Array<{ text: string; pinnedField?: string }>;
  descriptions: Array<{ text: string; pinnedField?: string }>;
  finalUrls: string[];
  path1: string;
  path2: string;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  conversionsValue: string;
  ctr: string;
  averageCpcMicros: string;
  phoneCalls: number;
  messageChats: number;
}

export interface Keyword {
  id: string;
  accountId: string;
  runId: string;
  keywordId: string;
  keywordText: string;
  matchType: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  approvalStatus: string;
  cpcBidMicros: string | null;
  finalUrl: string;
  qualityScore: number | null;
  creativeRelevance: string;
  landingPageExperience: string;
  expectedCtr: string;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  conversionsValue: string;
  ctr: string;
  averageCpcMicros: string;
  searchImpressionShare: string | null;
  searchImpressionShareLostRank: string | null;
  searchImpressionShareLostBudget: string | null;
  phoneCalls: number;
}

export interface SearchTerm {
  id: string;
  accountId: string;
  runId: string;
  searchTerm: string;
  keywordId: string | null;
  keywordText: string | null;
  matchTypeTriggered: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  conversionsValue: string;
  ctr: string;
  averageCpcMicros: string;
}

export interface NegativeKeyword {
  id: string;
  accountId: string;
  runId: string;
  negativeKeywordId: string | null;
  keywordText: string;
  matchType: string;
  level: string;
  campaignId: string | null;
  campaignName: string | null;
  adGroupId: string | null;
  adGroupName: string | null;
  sharedSetId: string | null;
  sharedSetName: string | null;
}

export interface Asset {
  id: string;
  accountId: string;
  runId: string;
  assetId: string;
  assetType: string;
  assetText: string;
  description1: string;
  description2: string;
  finalUrl: string;
  phoneNumber: string;
  status: string;
  performanceLabel: string;
  source: string;
  linkedLevel: string;
  campaignId: string | null;
  adGroupId: string | null;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  ctr: string;
}

export interface KpiData {
  runId: string;
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalAdGroups: number;
    activeAdGroups: number;
    totalKeywords: number;
    activeKeywords: number;
    totalAds: number;
    totalSearchTerms: number;
    totalNegativeKeywords: number;
  };
  performance: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionsValue: number;
    ctr: number;
    avgCpc: number;
    cpa: number;
    roas: number;
    conversionRate: number;
  };
  quality: {
    avgQualityScore: number;
    lowQualityKeywords: number;
    excellentAds: number;
    goodAds: number;
    weakAds: number;
  };
}

// Filter types
export interface BaseFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  runId?: string;
  search?: string;
}

export interface CampaignFilters extends BaseFilters {
  status?: string[];
  advertisingChannelType?: string[];
  biddingStrategyType?: string[];
  minImpressions?: number;
  minClicks?: number;
  minConversions?: number;
  minCost?: number;
}

export interface AdGroupFilters extends BaseFilters {
  campaignId?: string;
  status?: string[];
  minImpressions?: number;
  minConversions?: number;
}

export interface KeywordFilters extends BaseFilters {
  campaignId?: string;
  adGroupId?: string;
  status?: string[];
  matchType?: string[];
  minQualityScore?: number;
  maxQualityScore?: number;
  minImpressions?: number;
  minConversions?: number;
}

export interface SearchTermFilters extends BaseFilters {
  campaignId?: string;
  adGroupId?: string;
  keywordId?: string;
  minImpressions?: number;
  minConversions?: number;
  minCost?: number;
}

export interface AssetFilters extends BaseFilters {
  campaignId?: string;
  assetType?: string;
  performanceLabel?: string[];
  status?: string[];
}

export interface AdFilters extends BaseFilters {
  campaignId?: string;
  adGroupId?: string;
  status?: string[];
  adType?: string[];
  adStrength?: string[];
  minImpressions?: number;
}

export interface NegativeKeywordFilters extends BaseFilters {
  campaignId?: string;
  adGroupId?: string;
  level?: string[];
  matchType?: string[];
}

export interface ConversionAction {
  id: string;
  accountId: string;
  runId: string;
  conversionActionId: string;
  name: string;
  status: string;
  type: string;
  category: string;
  origin: string;
  countingType: string;
  defaultValue: number | null;
  alwaysUseDefaultValue: boolean;
  primaryForGoal: boolean;
  campaignsUsingCount: number;
  importedAt: string;
}

export interface ConversionActionFilters extends BaseFilters {
  status?: string[];
  type?: string[];
  category?: string[];
  primaryForGoal?: boolean;
}
