export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  totpEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleAdsAccount {
  id: string;
  customerId: string;
  customerName: string;
  currencyCode: string;
  timeZone: string;
  isActive: boolean;
  createdAt: string;
}

export interface Campaign {
  id: string;
  campaignId: string;
  campaignName: string;
  status: string;
  advertisingChannelType: string;
  biddingStrategyType: string;
  targetCpaMicros: string | null;
  targetRoas: string | null;
  budgetMicros: string;
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

export interface AdGroup {
  id: string;
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
  phoneCalls: number;
  messageChats: number;
}

export interface Ad {
  id: string;
  adId: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  adType: string;
  status: string;
  approvalStatus: string;
  adStrength: string;
  headlines: { text: string; pinnedField?: string }[];
  descriptions: { text: string; pinnedField?: string }[];
  finalUrls: string[];
  path1: string;
  path2: string;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  ctr: string;
}

export interface Keyword {
  id: string;
  keywordId: string;
  keywordText: string;
  matchType: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  qualityScore: number | null;
  creativeRelevance: string | null;
  landingPageExperience: string | null;
  expectedCtr: string | null;
  impressions: string;
  clicks: string;
  costMicros: string;
  conversions: string;
  ctr: string;
  averageCpcMicros: string;
}

export interface SearchTerm {
  id: string;
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
  ctr: string;
}

export interface NegativeKeyword {
  id: string;
  negativeKeywordId: string | null;
  keywordText: string;
  matchType: string;
  level: string;
  campaignId: string | null;
  campaignName: string | null;
  adGroupId: string | null;
  adGroupName: string | null;
  sharedSetName: string | null;
}

export interface Audit {
  id: string;
  accountId: string;
  runId: string;
  name: string;
  status: 'in_progress' | 'completed' | 'archived';
  modulesCompleted: number[];
  currentModule: number;
  createdAt: string;
  updatedAt: string;
}

export interface Decision {
  id: string;
  decisionGroupId: string;
  version: number;
  isCurrent: boolean;
  moduleId: number;
  entityType: string;
  entityId: string;
  entityName: string;
  actionType: string;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
  rationale: string;
  status: 'draft' | 'approved' | 'exported' | 'applied' | 'rolled_back';
  createdAt: string;
}

export interface ChangeSet {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'approved' | 'exported' | 'applied';
  createdAt: string;
  exportedAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requiresTwoFactor?: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// AI Types
export * from './ai';
