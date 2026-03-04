import { apiClient } from './client';

export interface KeywordClusterItem {
  keywordText: string;
  keywordId?: string;
  impressions?: number;
  clicks?: number;
  cost?: number;
  conversions?: number;
  qualityScore?: number;
  matchType?: string;
  finalUrl?: string;
  landingPageExperience?: string;
}

export interface BriefSection {
  type: string;
  title: string;
  instructions: string;
  keyPoints: string[];
}

export interface Brief {
  pagePurpose?: string;
  targetAudience?: string;
  metaTitle?: string;
  metaDescription?: string;
  sections?: BriefSection[];
  seoNotes?: string[];
  currentLpIssues?: string[];
}

export interface LandingPageBrief {
  id: string;
  accountId: string;
  name: string;
  sourceUrl: string | null;
  primaryKeyword: string | null;
  keywordCluster: KeywordClusterItem[] | null;
  scrapedContent: any | null;
  brief: Brief | null;
  status: 'draft' | 'completed';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordCluster {
  topic: string;
  primaryKeyword: string;
  keywords: KeywordClusterItem[];
  currentUrl: string;
  avgQualityScore: number;
  totalCost: number;
  totalConversions: number;
}

export async function listBriefs(accountId: string): Promise<LandingPageBrief[]> {
  return apiClient.get<LandingPageBrief[]>(`/landing-pages/account/${accountId}`);
}

export async function getBrief(id: string): Promise<LandingPageBrief> {
  return apiClient.get<LandingPageBrief>(`/landing-pages/${id}`);
}

export async function generateClusters(accountId: string): Promise<{
  clusters: KeywordCluster[];
  excludedKeywordCount: number;
  totalKeywordCount: number;
}> {
  return apiClient.post<{
    clusters: KeywordCluster[];
    excludedKeywordCount: number;
    totalKeywordCount: number;
  }>('/landing-pages/cluster', { accountId });
}

export async function createBrief(data: {
  accountId: string;
  name: string;
  sourceUrl?: string;
  primaryKeyword?: string;
  keywordCluster?: KeywordClusterItem[];
}): Promise<LandingPageBrief> {
  return apiClient.post<LandingPageBrief>('/landing-pages', data);
}

export async function scrapeSourceUrl(id: string): Promise<LandingPageBrief> {
  return apiClient.post<LandingPageBrief>(`/landing-pages/${id}/scrape`);
}

export async function generateBrief(id: string): Promise<LandingPageBrief> {
  return apiClient.post<LandingPageBrief>(`/landing-pages/${id}/generate-brief`);
}

export async function updateBrief(id: string, data: {
  name?: string;
  notes?: string;
  status?: string;
  sourceUrl?: string;
}): Promise<LandingPageBrief> {
  return apiClient.patch<LandingPageBrief>(`/landing-pages/${id}`, data);
}

export async function deleteBrief(id: string): Promise<void> {
  return apiClient.delete(`/landing-pages/${id}`);
}
