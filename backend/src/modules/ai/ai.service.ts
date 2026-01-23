import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    // Fetch data based on module requirements
    const { data, stats } = await this.fetchModuleData(
      accountId,
      latestRun.runId,
      moduleId,
      filters,
    );

    // Build the prompt with actual data
    const userPrompt = this.buildUserPrompt(moduleConfig, data, stats);

    // Call OpenAI
    const recommendations = await this.callOpenAI(
      openai,
      moduleConfig.systemPrompt,
      userPrompt,
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

  private async fetchModuleData(
    accountId: string,
    runId: string,
    moduleId: number,
    filters?: Record<string, any>,
  ): Promise<{ data: any; stats: { totalRecords: number; analyzedRecords: number } }> {
    const baseWhere = { accountId, runId };

    switch (moduleId) {
      case 1: // Conversion Goals
      case 2: // Consent Mode
        const conversions = await this.conversionActionRepository.find({
          where: baseWhere,
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
          where: { ...baseWhere, status: 'ENABLED' },
        });
        return {
          data: { adGroups, aggregates: this.calculateAdGroupAggregates(adGroups) },
          stats: { totalRecords: adGroups.length, analyzedRecords: adGroups.length },
        };

      case 11: // Targeting Settings
        const [geoData, deviceData] = await Promise.all([
          this.geoPerformanceRepository.find({ where: baseWhere }),
          this.devicePerformanceRepository.find({ where: baseWhere }),
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
          where: baseWhere,
        });
        return {
          data: { assets },
          stats: { totalRecords: assets.length, analyzedRecords: assets.length },
        };

      case 15: // Ad Effectiveness
      case 16: // Ad Conversions
        const ads = await this.adRepository.find({
          where: { ...baseWhere, status: 'ENABLED' },
        });
        return {
          data: { ads, aggregates: this.calculateAdAggregates(ads) },
          stats: { totalRecords: ads.length, analyzedRecords: ads.length },
        };

      case 17: // Call Extensions
      case 18: // Message Extensions
        const [campaignsForExt, assetsForExt] = await Promise.all([
          this.campaignRepository.find({ where: { ...baseWhere, status: 'ENABLED' } }),
          this.assetRepository.find({ where: baseWhere }),
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
        const keywords = await this.keywordRepository.find({
          where: { ...baseWhere, status: 'ENABLED' },
        });
        let adsForCoherence: Ad[] = [];
        if (moduleId === 21) {
          adsForCoherence = await this.adRepository.find({
            where: { ...baseWhere, status: 'ENABLED' },
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
        const searchTerms = await this.searchTermRepository.find({
          where: baseWhere,
          order: { costMicros: 'DESC' },
          take: 500, // Limit to top 500 by cost
        });
        return {
          data: { searchTerms, aggregates: this.calculateSearchTermAggregates(searchTerms) },
          stats: { totalRecords: searchTerms.length, analyzedRecords: Math.min(searchTerms.length, 500) },
        };

      case 23: // Negative Keywords
        const [negatives, searchTermsForNeg] = await Promise.all([
          this.negativeKeywordRepository.find({ where: baseWhere }),
          this.searchTermRepository.find({
            where: baseWhere,
            order: { costMicros: 'DESC' },
            take: 200,
          }),
        ]);
        return {
          data: { negatives, searchTerms: searchTermsForNeg },
          stats: { totalRecords: negatives.length, analyzedRecords: negatives.length },
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

    if (data.keywords) {
      return data.keywords.slice(0, 200).map((k: Keyword) => ({
        id: k.keywordId,
        text: k.keywordText,
        matchType: k.matchType,
        adGroup: k.adGroupName,
        campaign: k.campaignName,
        qualityScore: k.qualityScore,
        creativeRelevance: k.creativeRelevance,
        landingPageExp: k.landingPageExperience,
        expectedCtr: k.expectedCtr,
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
    return searchTerms.slice(0, 200).map(st => ({
      term: st.searchTerm,
      keyword: st.keywordText,
      matchType: st.matchTypeTriggered,
      campaign: st.campaignName,
      adGroup: st.adGroupName,
      cost: (Number(st.costMicros || 0) / 1_000_000).toFixed(2),
      conversions: st.conversions,
      ctr: st.ctr,
    }));
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
