import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import OpenAI from 'openai';
import {
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  SearchTerm,
  NegativeKeyword,
  Asset,
  ConversionAction,
  GeoPerformance,
  DevicePerformance,
  GoogleAdsAccount,
  ImportRun,
  ImportStatus,
  AIAnalysisLog,
  AnalysisTriggerType,
  AnalysisStatus,
  Modification,
} from '../../entities';
import {
  AIAnalysisResponse,
  AIRecommendation,
} from './dto';
import {
  MODULE_PROMPTS,
  getModulePrompt,
  SUPPORTED_MODULES,
} from './prompts/module-prompts';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(AdGroup)
    private adGroupRepository: Repository<AdGroup>,
    @InjectRepository(Ad)
    private adRepository: Repository<Ad>,
    @InjectRepository(Keyword)
    private keywordRepository: Repository<Keyword>,
    @InjectRepository(SearchTerm)
    private searchTermRepository: Repository<SearchTerm>,
    @InjectRepository(NegativeKeyword)
    private negativeKeywordRepository: Repository<NegativeKeyword>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    @InjectRepository(ConversionAction)
    private conversionActionRepository: Repository<ConversionAction>,
    @InjectRepository(GeoPerformance)
    private geoPerformanceRepository: Repository<GeoPerformance>,
    @InjectRepository(DevicePerformance)
    private devicePerformanceRepository: Repository<DevicePerformance>,
    @InjectRepository(GoogleAdsAccount)
    private accountRepository: Repository<GoogleAdsAccount>,
    @InjectRepository(ImportRun)
    private importRunRepository: Repository<ImportRun>,
    @InjectRepository(AIAnalysisLog)
    private analysisLogRepository: Repository<AIAnalysisLog>,
    @InjectRepository(Modification)
    private modificationRepository: Repository<Modification>,
  ) {}

  private async getOpenAIClient(): Promise<OpenAI> {
    // First try to get from database settings
    let apiKey = await this.settingsService.getOpenAIApiKey();
    
    // Fallback to config/env
    if (!apiKey) {
      apiKey = this.configService.get<string>('ai.openaiApiKey') ?? null;
    }

    if (!apiKey) {
      throw new BadRequestException('OpenAI API key not configured. Please configure it in Settings > AI.');
    }

    return new OpenAI({ apiKey });
  }

  async analyzeModule(
    accountId: string,
    moduleId: number,
    filters?: Record<string, any>,
  ): Promise<AIAnalysisResponse> {
    const openai = await this.getOpenAIClient();

    if (!SUPPORTED_MODULES.includes(moduleId)) {
      throw new BadRequestException(`Module ${moduleId} is not supported for AI analysis`);
    }

    const moduleConfig = getModulePrompt(moduleId);
    if (!moduleConfig) {
      throw new BadRequestException(`Module ${moduleId} configuration not found`);
    }

    // Get latest run for this account
    const latestRun = await this.getLatestRun(accountId);
    if (!latestRun) {
      throw new BadRequestException('No data available for this account');
    }

    // Fetch active campaigns with bidding strategies (contesto globale per tutti i moduli)
    const activeCampaigns = await this.campaignRepository.find({
      where: { accountId, runId: latestRun.runId, status: 'ENABLED' },
    });
    const campaignStrategyContext = this.buildCampaignStrategyContext(activeCampaigns);

    // Fetch data based on module requirements
    const { data, stats } = await this.fetchModuleData(
      accountId,
      latestRun.runId,
      moduleId,
      filters,
    );

    // Build the prompt with actual data
    const userPrompt = this.buildUserPrompt(moduleConfig, data, stats);

    // Prepend strategy context to both system and user prompts
    const enrichedSystemPrompt = campaignStrategyContext.systemPrefix + '\n\n' + moduleConfig.systemPrompt;
    const enrichedUserPrompt = campaignStrategyContext.userPrefix + '\n\n' + userPrompt;

    // Call OpenAI
    const recommendations = await this.callOpenAI(
      openai,
      enrichedSystemPrompt,
      enrichedUserPrompt,
    );

    return {
      moduleId,
      moduleName: moduleConfig.moduleNameIt,
      summary: recommendations.summary,
      recommendations: recommendations.recommendations,
      analyzedAt: new Date(),
      dataStats: {
        totalRecords: stats.totalRecords,
        analyzedRecords: stats.analyzedRecords,
      },
    };
  }

  private async getLatestRun(accountId: string): Promise<ImportRun | null> {
    return this.importRunRepository.findOne({
      where: { accountId, status: ImportStatus.COMPLETED },
      order: { completedAt: 'DESC' },
    });
  }

  /**
   * Recupera gli ID delle campagne attive (ENABLED) per un account/run.
   */
  private async getActiveCampaignIds(accountId: string, runId: string): Promise<string[]> {
    const activeCampaigns = await this.campaignRepository.find({
      where: { accountId, runId, status: 'ENABLED' },
      select: ['campaignId'],
    });
    return activeCampaigns.map(c => c.campaignId);
  }

  /**
   * Recupera gli ID degli ad group attivi (ENABLED) in campagne attive.
   * Usato per filtrare keyword, ads e search terms.
   */
  private async getActiveAdGroupIds(accountId: string, runId: string, activeCampaignIds: string[]): Promise<string[]> {
    if (activeCampaignIds.length === 0) return [];
    const activeAdGroups = await this.adGroupRepository.find({
      where: { accountId, runId, status: 'ENABLED', campaignId: In(activeCampaignIds) },
      select: ['adGroupId'],
    });
    return activeAdGroups.map(ag => ag.adGroupId);
  }

  /**
   * Costruisce il contesto globale sulle bidding strategy delle campagne.
   * Viene iniettato in TUTTI i moduli AI come prefisso al system prompt e user prompt.
   */
  private buildCampaignStrategyContext(campaigns: Campaign[]): { systemPrefix: string; userPrefix: string } {
    // Raggruppa campagne per strategia
    const byStrategy: Record<string, { names: string[]; ids: string[]; cost: number }> = {};
    for (const c of campaigns) {
      const strategy = c.biddingStrategyType || 'UNKNOWN';
      if (!byStrategy[strategy]) {
        byStrategy[strategy] = { names: [], ids: [], cost: 0 };
      }
      byStrategy[strategy].names.push(c.campaignName);
      byStrategy[strategy].ids.push(c.campaignId);
      byStrategy[strategy].cost += Number(c.costMicros || 0) / 1_000_000;
    }

    // Determina la categoria per ogni strategia
    const visibilityStrategies = ['TARGET_IMPRESSION_SHARE'];
    const trafficStrategies = ['MAXIMIZE_CLICKS', 'MANUAL_CPC', 'MANUAL_CPM', 'TARGET_CPM'];
    const conversionStrategies = ['MAXIMIZE_CONVERSIONS', 'MAXIMIZE_CONVERSION_VALUE', 'TARGET_CPA', 'TARGET_ROAS'];

    const categorized = Object.entries(byStrategy).map(([strategy, data]) => {
      let category: string;
      if (visibilityStrategies.includes(strategy)) {
        category = 'VISIBILITA';
      } else if (trafficStrategies.includes(strategy)) {
        category = 'TRAFFICO';
      } else if (conversionStrategies.includes(strategy)) {
        category = 'CONVERSIONI';
      } else {
        category = 'ALTRO';
      }
      return { strategy, category, ...data };
    });

    const systemPrefix = `REGOLA FONDAMENTALE - ADATTA L'ANALISI ALLA BIDDING STRATEGY:
La bidding strategy della campagna determina quali metriche sono rilevanti per TUTTE le entita al suo interno (ad group, keyword, annunci, search terms, landing page, ecc.).

- Campagne VISIBILITA (Target Impression Share): l'obiettivo e apparire. Metriche rilevanti: impressioni, impression share, posizione. NON penalizzare per assenza di conversioni.
- Campagne TRAFFICO (Maximize Clicks, Manual CPC): l'obiettivo e portare click. Metriche rilevanti: click, CTR, CPC. NON penalizzare per assenza di conversioni.
- Campagne CONVERSIONI (Target CPA, Maximize Conversions, Target ROAS): l'obiettivo e convertire. Metriche rilevanti: conversioni, CPA, ROAS, tasso di conversione.

QUANDO analizzi un ad group, keyword, annuncio o qualsiasi entita, DEVI prima verificare a quale campagna appartiene e quale strategia usa. Le raccomandazioni devono essere coerenti con la strategia.`;

    // Build user context block
    const campaignLines = categorized.map(c =>
      `- [${c.category}] Strategia: ${c.strategy} | Campagne: ${c.names.join(', ')} | Spesa: €${c.cost.toFixed(2)}`
    ).join('\n');

    const userPrefix = `CONTESTO CAMPAGNE E STRATEGIE:
${campaignLines}

Usa questo contesto per interpretare correttamente i dati che seguono. Le metriche da valutare dipendono dalla strategia della campagna padre.`;

    return { systemPrefix, userPrefix };
  }

  private async fetchModuleData(
    accountId: string,
    runId: string,
    moduleId: number,
    filters?: Record<string, any>,
  ): Promise<{ data: any; stats: { totalRecords: number; analyzedRecords: number } }> {
    const baseWhere = { accountId, runId };

    // Pre-calcola gli ID delle campagne e ad group attivi
    const activeCampaignIds = await this.getActiveCampaignIds(accountId, runId);
    const activeCampaignFilter = activeCampaignIds.length > 0
      ? { ...baseWhere, campaignId: In(activeCampaignIds) }
      : baseWhere;

    const activeAdGroupIds = await this.getActiveAdGroupIds(accountId, runId, activeCampaignIds);
    const activeAdGroupFilter = activeAdGroupIds.length > 0
      ? { ...baseWhere, adGroupId: In(activeAdGroupIds) }
      : activeCampaignFilter;

    switch (moduleId) {
      case 1: // Conversion Goals
      case 2: // Consent Mode
        const conversions = await this.conversionActionRepository.find({
          where: { ...baseWhere, status: 'ENABLED' },
        });
        return {
          data: { conversions },
          stats: { totalRecords: conversions.length, analyzedRecords: conversions.length },
        };

      case 4: // Bidding Strategy
      case 9: // Conversions breakdown
      case 10: // KPI
        const campaigns = await this.campaignRepository.find({
          where: { ...baseWhere, status: 'ENABLED' },
        });
        return {
          data: { campaigns, aggregates: this.calculateCampaignAggregates(campaigns) },
          stats: { totalRecords: campaigns.length, analyzedRecords: campaigns.length },
        };

      case 7: // Ad Groups Structure
      case 12: // CPA per Ad Group
      case 13: // Impression Share Ad Group
        const adGroups = await this.adGroupRepository.find({
          where: { ...activeCampaignFilter, status: 'ENABLED' },
        });
        return {
          data: { adGroups, aggregates: this.calculateAdGroupAggregates(adGroups) },
          stats: { totalRecords: adGroups.length, analyzedRecords: adGroups.length },
        };

      case 11: // Targeting Settings
        const [geoData, deviceData] = await Promise.all([
          this.geoPerformanceRepository.find({ where: activeCampaignFilter }),
          this.devicePerformanceRepository.find({ where: activeCampaignFilter }),
        ]);
        return {
          data: { geoData, deviceData },
          stats: {
            totalRecords: geoData.length + deviceData.length,
            analyzedRecords: geoData.length + deviceData.length,
          },
        };

      case 14: // Assets
        const assets = await this.assetRepository.find({
          where: { ...baseWhere, status: 'ENABLED' },
        });
        return {
          data: { assets },
          stats: { totalRecords: assets.length, analyzedRecords: assets.length },
        };

      case 15: // Ad Effectiveness
      case 16: // Ad Conversions
        const ads = await this.adRepository.find({
          where: { ...activeAdGroupFilter, status: 'ENABLED' },
        });
        return {
          data: { ads, aggregates: this.calculateAdAggregates(ads) },
          stats: { totalRecords: ads.length, analyzedRecords: ads.length },
        };

      case 17: // Call Extensions
      case 18: // Message Extensions
        const [campaignsForExt, assetsForExt] = await Promise.all([
          this.campaignRepository.find({ where: { ...baseWhere, status: 'ENABLED' } }),
          this.assetRepository.find({ where: { ...baseWhere, status: 'ENABLED' } }),
        ]);
        return {
          data: {
            campaigns: campaignsForExt,
            assets: assetsForExt,
            aggregates: this.calculateExtensionAggregates(campaignsForExt),
          },
          stats: {
            totalRecords: campaignsForExt.length,
            analyzedRecords: campaignsForExt.length,
          },
        };

      case 19: // Keyword Performance
      case 20: // Keyword Impression Share
      case 21: // Keyword-Ad-Landing Coherence
        const kwQb = this.keywordRepository.createQueryBuilder('kw');
        kwQb.where('kw.accountId = :accountId', { accountId });
        kwQb.andWhere('kw.runId = :runId', { runId });
        kwQb.andWhere('kw.status = :kwStatus', { kwStatus: 'ENABLED' });
        if (activeAdGroupIds.length > 0) {
          kwQb.andWhere('kw.adGroupId IN (:...activeAgIds)', { activeAgIds: activeAdGroupIds });
        }
        // Escludi keyword che sono anche negative keywords
        kwQb.andWhere(`NOT EXISTS (
          SELECT 1 FROM negative_keywords nk
          WHERE LOWER(nk.keyword_text) = LOWER(kw.keyword_text)
          AND nk.account_id = kw.account_id
          AND (
            nk.ad_group_id = kw.ad_group_id
            OR (nk.campaign_id = kw.campaign_id AND (nk.ad_group_id IS NULL OR nk.ad_group_id = ''))
            OR (nk.campaign_id IS NULL OR nk.campaign_id = '')
          )
        )`);
        const keywords = await kwQb.getMany();
        let adsForCoherence: Ad[] = [];
        if (moduleId === 21) {
          adsForCoherence = await this.adRepository.find({
            where: { ...activeAdGroupFilter, status: 'ENABLED' },
          });
        }
        return {
          data: {
            keywords,
            ads: adsForCoherence,
            aggregates: this.calculateKeywordAggregates(keywords),
          },
          stats: { totalRecords: keywords.length, analyzedRecords: keywords.length },
        };

      case 22: // Search Terms Analysis
        const [searchTerms, activeKeywordsForST, negativesForST] = await Promise.all([
          this.searchTermRepository.find({
            where: activeAdGroupFilter,
            order: { costMicros: 'DESC' },
            take: 500,
          }),
          this.keywordRepository.find({
            where: { ...activeAdGroupFilter, status: 'ENABLED' },
          }),
          this.negativeKeywordRepository.find({ where: activeCampaignFilter }),
        ]);
        return {
          data: {
            searchTerms,
            activeKeywords: activeKeywordsForST,
            negativeKeywords: negativesForST,
            aggregates: this.calculateSearchTermAggregates(searchTerms),
          },
          stats: { totalRecords: searchTerms.length, analyzedRecords: Math.min(searchTerms.length, 500) },
        };

      case 23: // Negative Keywords
        const [negatives, searchTermsForNeg] = await Promise.all([
          this.negativeKeywordRepository.find({ where: activeAdGroupFilter }),
          this.searchTermRepository.find({
            where: activeAdGroupFilter,
            order: { costMicros: 'DESC' },
            take: 200,
          }),
        ]);
        return {
          data: { negatives, searchTerms: searchTermsForNeg },
          stats: { totalRecords: negatives.length, analyzedRecords: negatives.length },
        };

      case 24: // Landing Page Analysis
        // Fetch campaigns to get bidding strategies
        const lpCampaigns = await this.campaignRepository.find({
          where: { ...baseWhere, status: 'ENABLED' },
        });
        const campaignStrategyMap = new Map<string, string>();
        for (const c of lpCampaigns) {
          campaignStrategyMap.set(c.campaignId, c.biddingStrategyType || 'UNKNOWN');
        }

        const lpKeywords = await this.keywordRepository.find({
          where: { ...activeAdGroupFilter, status: 'ENABLED' },
        });
        // Filter to only keywords with final URLs
        const kwWithUrls = lpKeywords.filter(kw => kw.finalUrl && kw.finalUrl.trim() !== '');
        // Group by URL for summary
        const urlGroups = new Map<string, {
          count: number; cost: number; conversions: number; impressions: number;
          clicks: number; experiences: string[]; strategies: Set<string>;
          campaignNames: Set<string>;
        }>();
        for (const kw of kwWithUrls) {
          const url = kw.finalUrl.replace(/\/+$/, '').toLowerCase();
          if (!urlGroups.has(url)) {
            urlGroups.set(url, {
              count: 0, cost: 0, conversions: 0, impressions: 0, clicks: 0,
              experiences: [], strategies: new Set(), campaignNames: new Set(),
            });
          }
          const g = urlGroups.get(url)!;
          g.count++;
          g.cost += Number(kw.costMicros || 0) / 1_000_000;
          g.conversions += Number(kw.conversions || 0);
          g.impressions += Number(kw.impressions || 0);
          g.clicks += Number(kw.clicks || 0);
          if (kw.landingPageExperience) g.experiences.push(kw.landingPageExperience);
          if (kw.campaignId) {
            const strategy = campaignStrategyMap.get(kw.campaignId) || 'UNKNOWN';
            g.strategies.add(strategy);
            g.campaignNames.add(kw.campaignName || kw.campaignId);
          }
        }

        // Determine account-level dominant strategy for context
        const allStrategies = lpCampaigns.map(c => c.biddingStrategyType || 'UNKNOWN');
        const strategyCounts = allStrategies.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<string, number>);
        const dominantAccountStrategy = Object.entries(strategyCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'UNKNOWN';

        const landingPageSummary = Array.from(urlGroups.entries()).map(([url, g]) => ({
          url,
          keywordCount: g.count,
          totalCost: parseFloat(g.cost.toFixed(2)),
          totalConversions: parseFloat(g.conversions.toFixed(2)),
          totalImpressions: g.impressions,
          totalClicks: g.clicks,
          ctr: g.impressions > 0 ? parseFloat(((g.clicks / g.impressions) * 100).toFixed(2)) : 0,
          cpc: g.clicks > 0 ? parseFloat((g.cost / g.clicks).toFixed(2)) : 0,
          dominantExperience: g.experiences.length > 0
            ? g.experiences.sort((a, b) =>
                g.experiences.filter(e => e === b).length - g.experiences.filter(e => e === a).length
              )[0]
            : 'UNKNOWN',
          biddingStrategies: Array.from(g.strategies),
          campaigns: Array.from(g.campaignNames),
        })).sort((a, b) => b.totalCost - a.totalCost);

        return {
          data: {
            keywords: kwWithUrls,
            landingPages: landingPageSummary,
            aggregates: {
              totalPages: landingPageSummary.length,
              totalKeywords: kwWithUrls.length,
              totalCost: landingPageSummary.reduce((s, lp) => s + lp.totalCost, 0).toFixed(2),
              totalConversions: landingPageSummary.reduce((s, lp) => s + lp.totalConversions, 0).toFixed(2),
              totalImpressions: landingPageSummary.reduce((s, lp) => s + lp.totalImpressions, 0),
              totalClicks: landingPageSummary.reduce((s, lp) => s + lp.totalClicks, 0),
              dominantAccountStrategy,
              aboveAvg: landingPageSummary.filter(lp => lp.dominantExperience === 'ABOVE_AVERAGE').length,
              avg: landingPageSummary.filter(lp => lp.dominantExperience === 'AVERAGE').length,
              belowAvg: landingPageSummary.filter(lp => lp.dominantExperience === 'BELOW_AVERAGE').length,
            },
          },
          stats: { totalRecords: kwWithUrls.length, analyzedRecords: kwWithUrls.length },
        };

      default:
        throw new BadRequestException(`Module ${moduleId} data fetching not implemented`);
    }
  }

  private calculateCampaignAggregates(campaigns: Campaign[]) {
    const totalCost = campaigns.reduce((sum, c) => sum + Number(c.costMicros || 0), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + Number(c.conversions || 0), 0);
    const totalConversionsValue = campaigns.reduce((sum, c) => sum + Number(c.conversionsValue || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);

    return {
      totalCost: (totalCost / 1_000_000).toFixed(2),
      totalConversions: totalConversions.toFixed(2),
      avgCpa: totalConversions > 0 ? ((totalCost / 1_000_000) / totalConversions).toFixed(2) : 'N/A',
      avgRoas: totalCost > 0 ? (totalConversionsValue / (totalCost / 1_000_000)).toFixed(2) : 'N/A',
      avgCtr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 'N/A',
      avgConvRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 'N/A',
    };
  }

  private calculateAdGroupAggregates(adGroups: AdGroup[]) {
    const totalCost = adGroups.reduce((sum, ag) => sum + Number(ag.costMicros || 0), 0);
    const totalConversions = adGroups.reduce((sum, ag) => sum + Number(ag.conversions || 0), 0);
    const totalClicks = adGroups.reduce((sum, ag) => sum + Number(ag.clicks || 0), 0);
    const totalImpressions = adGroups.reduce((sum, ag) => sum + Number(ag.impressions || 0), 0);

    return {
      avgCpa: totalConversions > 0 ? ((totalCost / 1_000_000) / totalConversions).toFixed(2) : 'N/A',
      avgCtr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 'N/A',
      avgConvRate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 'N/A',
    };
  }

  private calculateAdAggregates(ads: Ad[]) {
    const totalClicks = ads.reduce((sum, a) => sum + Number(a.clicks || 0), 0);
    const totalImpressions = ads.reduce((sum, a) => sum + Number(a.impressions || 0), 0);

    return {
      avgCtr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 'N/A',
    };
  }

  private calculateKeywordAggregates(keywords: Keyword[]) {
    const keywordsWithQS = keywords.filter(k => k.qualityScore != null);
    const avgQualityScore = keywordsWithQS.length > 0
      ? (keywordsWithQS.reduce((sum, k) => sum + (k.qualityScore || 0), 0) / keywordsWithQS.length).toFixed(1)
      : 'N/A';

    const totalCost = keywords.reduce((sum, k) => sum + Number(k.costMicros || 0), 0);
    const totalConversions = keywords.reduce((sum, k) => sum + Number(k.conversions || 0), 0);

    return {
      totalKeywords: keywords.length,
      activeKeywords: keywords.filter(k => k.status === 'ENABLED').length,
      avgQualityScore,
      avgCpa: totalConversions > 0 ? ((totalCost / 1_000_000) / totalConversions).toFixed(2) : 'N/A',
      targetCpa: '20.00', // Default, could be fetched from campaign settings
    };
  }

  private calculateSearchTermAggregates(searchTerms: SearchTerm[]) {
    const totalCost = searchTerms.reduce((sum, st) => sum + Number(st.costMicros || 0), 0);
    const totalConversions = searchTerms.reduce((sum, st) => sum + Number(st.conversions || 0), 0);

    return {
      targetCpa: '20.00',
      avgCpa: totalConversions > 0 ? ((totalCost / 1_000_000) / totalConversions).toFixed(2) : 'N/A',
    };
  }

  private calculateExtensionAggregates(campaigns: Campaign[]) {
    const totalCalls = campaigns.reduce((sum, c) => sum + (c.phoneCalls || 0), 0);
    const totalPhoneImpressions = campaigns.reduce((sum, c) => sum + (c.phoneImpressions || 0), 0);
    const totalChats = campaigns.reduce((sum, c) => sum + (c.messageChats || 0), 0);
    const totalMessageImpressions = campaigns.reduce((sum, c) => sum + (c.messageImpressions || 0), 0);

    return {
      totalCalls,
      phoneImpressions: totalPhoneImpressions,
      phoneRate: totalPhoneImpressions > 0 ? ((totalCalls / totalPhoneImpressions) * 100).toFixed(2) : 'N/A',
      totalChats,
      messageImpressions: totalMessageImpressions,
    };
  }

  private buildUserPrompt(
    moduleConfig: any,
    data: any,
    stats: { totalRecords: number; analyzedRecords: number },
  ): string {
    let prompt = moduleConfig.userPromptTemplate;

    // Replace data placeholder with JSON
    const dataForPrompt = this.prepareDataForPrompt(data);
    prompt = prompt.replace('{{data}}', JSON.stringify(dataForPrompt, null, 2));

    // Replace aggregate placeholders
    if (data.aggregates) {
      Object.entries(data.aggregates).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
      });
    }

    // Replace geo/device specific placeholders
    if (data.geoData) {
      prompt = prompt.replace('{{geoData}}', JSON.stringify(this.prepareGeoDataForPrompt(data.geoData), null, 2));
    }
    if (data.deviceData) {
      prompt = prompt.replace('{{deviceData}}', JSON.stringify(this.prepareDeviceDataForPrompt(data.deviceData), null, 2));
    }
    if (data.negatives) {
      prompt = prompt.replace('{{negativeData}}', JSON.stringify(data.negatives.slice(0, 100), null, 2));
    }
    if (data.searchTerms) {
      prompt = prompt.replace('{{searchTermsData}}', JSON.stringify(this.prepareSearchTermsForPrompt(data.searchTerms), null, 2));
    }
    // Keyword attive per anti-cannibalizzazione (modulo 22)
    if (data.activeKeywords) {
      const kwSummary = this.prepareActiveKeywordsForContext(data.activeKeywords);
      prompt = prompt.replace('{{activeKeywords}}', JSON.stringify(kwSummary, null, 2));
    }
    // Negative keywords esistenti per contesto (modulo 22)
    if (data.negativeKeywords) {
      const negSummary = data.negativeKeywords.slice(0, 150).map((nk: NegativeKeyword) => ({
        text: nk.keywordText,
        matchType: nk.matchType,
        level: nk.adGroupId ? 'ad_group' : nk.campaignId ? 'campaign' : 'account',
        campaignId: nk.campaignId,
        adGroupId: nk.adGroupId,
      }));
      prompt = prompt.replace('{{negativeKeywords}}', JSON.stringify(negSummary, null, 2));
    }

    return prompt;
  }

  private prepareDataForPrompt(data: any): any {
    // Limit and simplify data for prompt to avoid token limits
    if (data.campaigns) {
      return data.campaigns.slice(0, 50).map((c: Campaign) => ({
        id: c.campaignId,
        name: c.campaignName,
        status: c.status,
        biddingStrategy: c.biddingStrategyType,
        targetCpa: c.targetCpaMicros ? (Number(c.targetCpaMicros) / 1_000_000).toFixed(2) : null,
        targetRoas: c.targetRoas,
        budget: c.budgetMicros ? (Number(c.budgetMicros) / 1_000_000).toFixed(2) : null,
        cost: (Number(c.costMicros || 0) / 1_000_000).toFixed(2),
        conversions: c.conversions,
        ctr: c.ctr,
        impressionShare: c.searchImpressionShare,
        isLostRank: c.searchImpressionShareLostRank,
        isLostBudget: c.searchImpressionShareLostBudget,
      }));
    }

    if (data.adGroups) {
      return data.adGroups.slice(0, 100).map((ag: AdGroup) => ({
        id: ag.adGroupId,
        name: ag.adGroupName,
        campaign: ag.campaignName,
        status: ag.status,
        cost: (Number(ag.costMicros || 0) / 1_000_000).toFixed(2),
        conversions: ag.conversions,
        ctr: ag.ctr,
        impressionShare: ag.searchImpressionShare,
        isLostRank: ag.searchImpressionShareLostRank,
      }));
    }

    // Landing page summary for module 24 — must be before keywords check
    if (data.landingPages) {
      return data.landingPages.slice(0, 50);
    }

    if (data.keywords) {
      return data.keywords.slice(0, 200).map((k: Keyword) => ({
        id: k.keywordId,
        adGroupId: k.adGroupId,
        campaignId: k.campaignId,
        text: k.keywordText,
        matchType: k.matchType,
        adGroup: k.adGroupName,
        campaign: k.campaignName,
        qualityScore: k.qualityScore,
        creativeRelevance: k.creativeRelevance,
        landingPageExp: k.landingPageExperience,
        expectedCtr: k.expectedCtr,
        cpcBid: k.cpcBidMicros ? (Number(k.cpcBidMicros) / 1_000_000).toFixed(2) : null,
        finalUrl: k.finalUrl || null,
        cost: (Number(k.costMicros || 0) / 1_000_000).toFixed(2),
        conversions: k.conversions,
        ctr: k.ctr,
        impressionShare: k.searchImpressionShare,
        isLostRank: k.searchImpressionShareLostRank,
        isLostBudget: k.searchImpressionShareLostBudget,
      }));
    }

    if (data.ads) {
      return data.ads.slice(0, 100).map((a: Ad) => ({
        id: a.adId,
        adGroup: a.adGroupName,
        campaign: a.campaignName,
        type: a.adType,
        strength: a.adStrength,
        headlines: a.headlines,
        descriptions: a.descriptions,
        cost: (Number(a.costMicros || 0) / 1_000_000).toFixed(2),
        conversions: a.conversions,
        ctr: a.ctr,
      }));
    }

    if (data.searchTerms) {
      return this.prepareSearchTermsForPrompt(data.searchTerms);
    }

    if (data.assets) {
      return data.assets.slice(0, 100).map((a: Asset) => ({
        id: a.assetId,
        type: a.assetType,
        text: a.assetText,
        performance: a.performanceLabel,
        cost: (Number(a.costMicros || 0) / 1_000_000).toFixed(2),
        clicks: a.clicks,
        ctr: a.ctr,
      }));
    }

    if (data.conversions) {
      return data.conversions.map((c: ConversionAction) => ({
        id: c.conversionActionId,
        name: c.name,
        status: c.status,
        type: c.type,
        category: c.category,
        origin: c.origin,
        countingType: c.countingType,
        defaultValue: c.defaultValue,
        primaryForGoal: c.primaryForGoal,
        campaignsUsing: c.campaignsUsingCount,
      }));
    }

    return data;
  }

  private prepareGeoDataForPrompt(geoData: GeoPerformance[]): any[] {
    return geoData.slice(0, 50).map(g => ({
      campaign: g.campaignName,
      location: g.locationName,
      cost: (Number(g.costMicros || 0) / 1_000_000).toFixed(2),
      conversions: g.conversions,
      bidModifier: g.bidModifier,
    }));
  }

  private prepareDeviceDataForPrompt(deviceData: DevicePerformance[]): any[] {
    return deviceData.map(d => ({
      campaign: d.campaignName,
      device: d.device,
      cost: (Number(d.costMicros || 0) / 1_000_000).toFixed(2),
      conversions: d.conversions,
      bidModifier: d.bidModifier,
    }));
  }

  private prepareSearchTermsForPrompt(searchTerms: SearchTerm[]): any[] {
    return searchTerms.slice(0, 300).map(st => ({
      term: st.searchTerm,
      keyword: st.keywordText,
      matchType: st.matchTypeTriggered,
      campaign: st.campaignName,
      campaignId: st.campaignId,
      adGroup: st.adGroupName,
      adGroupId: st.adGroupId,
      cost: (Number(st.costMicros || 0) / 1_000_000).toFixed(2),
      conversions: st.conversions,
      impressions: st.impressions,
      ctr: st.ctr,
    }));
  }

  // Prepara le keyword attive raggruppate per ad group (per contesto anti-cannibalizzazione)
  private prepareActiveKeywordsForContext(keywords: Keyword[]): any[] {
    // Raggruppa per ad group per dare contesto strutturale
    const byAdGroup: Record<string, { adGroupName: string; adGroupId: string; campaignName: string; campaignId: string; keywords: { text: string; matchType: string }[] }> = {};
    for (const kw of keywords) {
      const key = kw.adGroupId;
      if (!byAdGroup[key]) {
        byAdGroup[key] = {
          adGroupName: kw.adGroupName,
          adGroupId: kw.adGroupId,
          campaignName: kw.campaignName,
          campaignId: kw.campaignId,
          keywords: [],
        };
      }
      byAdGroup[key].keywords.push({
        text: kw.keywordText,
        matchType: kw.matchType,
      });
    }
    return Object.values(byAdGroup);
  }

  private async callOpenAI(
    openai: OpenAI,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ summary: string; recommendations: AIRecommendation[] }> {
    // Get model from settings or fallback
    let model = await this.settingsService.getOpenAIModel();
    if (!model) {
      model = this.configService.get<string>('ai.openaiModel') || 'gpt-4o';
    }
    const maxTokens = this.configService.get<number>('ai.maxTokens') || 4096;

    try {
      this.logger.log(`Calling OpenAI model: ${model}`);

      // GPT-5.x models use max_completion_tokens instead of max_tokens
      const isGpt5 = model.startsWith('gpt-5');

      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        ...(isGpt5 ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
        temperature: 0.3, // Lower temperature for more consistent analysis
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);

      // Validate and normalize recommendations
      const recommendations: AIRecommendation[] = (parsed.recommendations || []).map(
        (rec: any, index: number) => ({
          id: rec.id || `rec_${index + 1}`,
          priority: rec.priority || 'medium',
          entityType: rec.entityType || 'unknown',
          entityId: rec.entityId || '',
          entityName: rec.entityName || '',
          action: rec.action || '',
          currentValue: rec.currentValue,
          suggestedValue: rec.suggestedValue,
          rationale: rec.rationale || '',
          expectedImpact: rec.expectedImpact,
          campaignId: rec.campaignId || undefined,
          adGroupId: rec.adGroupId || undefined,
        }),
      );

      return {
        summary: parsed.summary || 'Analysis completed',
        recommendations,
      };
    } catch (error) {
      this.logger.error('OpenAI API error:', error);
      throw new BadRequestException(`AI analysis failed: ${error.message}`);
    }
  }

  // Get supported modules list
  // =========================================================================
  // AI ANALYSIS LOG & ANALYZE ALL
  // =========================================================================

  async analyzeAllModules(
    accountId: string,
    userId?: string,
    triggerType: AnalysisTriggerType = AnalysisTriggerType.MANUAL,
  ): Promise<AIAnalysisLog> {
    const startedAt = new Date();

    // Create log entry
    const log = this.analysisLogRepository.create({
      accountId,
      triggeredById: userId || null,
      triggerType,
      status: AnalysisStatus.RUNNING,
      startedAt,
      modulesAnalyzed: [],
      totalRecommendations: 0,
    });
    await this.analysisLogRepository.save(log);

    const moduleResults: Record<string, { success: boolean; recommendations: number; error?: string }> = {};
    const analyzedModules: number[] = [];
    let totalRecs = 0;

    for (const moduleId of SUPPORTED_MODULES) {
      try {
        const result = await this.analyzeModule(accountId, moduleId);
        analyzedModules.push(moduleId);
        const recCount = result.recommendations?.length || 0;
        totalRecs += recCount;
        moduleResults[String(moduleId)] = {
          success: true,
          recommendations: recCount,
        };
      } catch (error) {
        this.logger.error(`Module ${moduleId} failed: ${error.message}`);
        moduleResults[String(moduleId)] = {
          success: false,
          recommendations: 0,
          error: error.message,
        };
      }
    }

    const completedAt = new Date();
    log.status = AnalysisStatus.COMPLETED;
    log.completedAt = completedAt;
    log.durationMs = completedAt.getTime() - startedAt.getTime();
    log.modulesAnalyzed = analyzedModules;
    log.totalRecommendations = totalRecs;
    log.moduleResults = moduleResults;

    return this.analysisLogRepository.save(log);
  }

  async getAnalysisHistory(accountId: string, limit = 10): Promise<AIAnalysisLog[]> {
    return this.analysisLogRepository.find({
      where: { accountId },
      order: { startedAt: 'DESC' },
      take: limit,
      relations: ['triggeredBy'],
    });
  }

  async getAcceptanceRate(accountId: string): Promise<{
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    applied: number;
    rate: number;
  }> {
    const result = await this.modificationRepository
      .createQueryBuilder('m')
      .select('m.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('m.account_id = :accountId', { accountId })
      .groupBy('m.status')
      .getRawMany();

    const counts: Record<string, number> = {};
    result.forEach((r) => {
      counts[r.status] = parseInt(r.count, 10);
    });

    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    const approved = (counts['approved'] || 0) + (counts['applied'] || 0);
    const rejected = counts['rejected'] || 0;
    const pending = counts['pending'] || 0;
    const applied = counts['applied'] || 0;
    const rate = total > 0 ? Math.round(((approved) / total) * 100) : 0;

    return { total, approved, rejected, pending, applied, rate };
  }

  getSupportedModules(): { moduleId: number; moduleName: string; moduleNameIt: string }[] {
    return SUPPORTED_MODULES.map(id => {
      const config = MODULE_PROMPTS[id];
      return {
        moduleId: id,
        moduleName: config.moduleName,
        moduleNameIt: config.moduleNameIt,
      };
    });
  }
}
