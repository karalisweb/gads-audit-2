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
  AuditReport,
  ReportStatus,
  AuditReportMessage,
  AuditIssue,
} from '../../entities';
import {
  AIAnalysisResponse,
  AIRecommendation,
} from './dto';
import {
  MODULE_PROMPTS,
  getModulePrompt,
  SUPPORTED_MODULES,
  DOCUMENTATION_ONLY_MODULES,
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
    @InjectRepository(AuditReport)
    private auditReportRepository: Repository<AuditReport>,
    @InjectRepository(AuditReportMessage)
    private auditReportMessageRepository: Repository<AuditReportMessage>,
    @InjectRepository(AuditIssue)
    private auditIssueRepository: Repository<AuditIssue>,
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

    // Fetch decision history context (learning dalle decisioni utente approve/reject)
    const decisionHistoryContext = await this.buildDecisionHistoryContext(accountId);

    // Fetch data based on module requirements
    const { data, stats } = await this.fetchModuleData(
      accountId,
      latestRun.runId,
      moduleId,
      filters,
    );

    // Build the prompt with actual data
    const userPrompt = this.buildUserPrompt(moduleConfig, data, stats);

    // Prepend all context layers to prompts
    const enrichedSystemPrompt = [
      decisionHistoryContext.systemPrefix,
      campaignStrategyContext.systemPrefix,
      moduleConfig.systemPrompt,
    ].filter(Boolean).join('\n\n');

    const enrichedUserPrompt = [
      decisionHistoryContext.userPrefix,
      campaignStrategyContext.userPrefix,
      userPrompt,
    ].filter(Boolean).join('\n\n');

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

  /**
   * Costruisce il contesto storico delle decisioni dell'utente (approve/reject).
   * Aggrega le statistiche per categoria (entityType + modificationType) degli ultimi 6 mesi
   * e include i motivi di rifiuto più frequenti, così l'AI adatta le raccomandazioni.
   */
  private async buildDecisionHistoryContext(
    accountId: string,
  ): Promise<{ systemPrefix: string; userPrefix: string }> {
    try {
      // Query 1: Statistiche approve/reject per categoria
      const stats = await this.modificationRepository
        .createQueryBuilder('m')
        .select('m.entity_type', 'entityType')
        .addSelect('m.modification_type', 'modificationType')
        .addSelect('m.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('m.account_id = :accountId', { accountId })
        .andWhere('m.status IN (:...statuses)', {
          statuses: ['approved', 'applied', 'rejected'],
        })
        .andWhere("m.created_at > NOW() - INTERVAL '6 months'")
        .groupBy('m.entity_type')
        .addGroupBy('m.modification_type')
        .addGroupBy('m.status')
        .getRawMany();

      // Query 2: Motivi di rifiuto più frequenti per categoria
      const rejectionReasons = await this.modificationRepository
        .createQueryBuilder('m')
        .select('m.entity_type', 'entityType')
        .addSelect('m.modification_type', 'modificationType')
        .addSelect('m.rejection_reason', 'rejectionReason')
        .addSelect('COUNT(*)', 'count')
        .where('m.account_id = :accountId', { accountId })
        .andWhere('m.status = :status', { status: 'rejected' })
        .andWhere('m.rejection_reason IS NOT NULL')
        .andWhere("m.rejection_reason != ''")
        .andWhere("m.created_at > NOW() - INTERVAL '6 months'")
        .groupBy('m.entity_type')
        .addGroupBy('m.modification_type')
        .addGroupBy('m.rejection_reason')
        .orderBy('"count"', 'DESC')
        .getRawMany();

      // Aggrega per categoria
      const categories = new Map<string, {
        approved: number;
        rejected: number;
        total: number;
        rate: number;
        topRejectionReasons: { reason: string; count: number }[];
      }>();

      for (const row of stats) {
        const key = `${row.entityType}::${row.modificationType}`;
        if (!categories.has(key)) {
          categories.set(key, { approved: 0, rejected: 0, total: 0, rate: 0, topRejectionReasons: [] });
        }
        const cat = categories.get(key)!;
        const count = parseInt(row.count, 10);
        if (row.status === 'approved' || row.status === 'applied') {
          cat.approved += count;
        } else if (row.status === 'rejected') {
          cat.rejected += count;
        }
        cat.total += count;
      }

      // Calcola tassi di approvazione
      for (const cat of categories.values()) {
        cat.rate = cat.total > 0 ? Math.round((cat.approved / cat.total) * 100) : 0;
      }

      // Associa top 3 motivi di rifiuto per categoria
      for (const row of rejectionReasons) {
        const key = `${row.entityType}::${row.modificationType}`;
        const cat = categories.get(key);
        if (cat && cat.topRejectionReasons.length < 3) {
          cat.topRejectionReasons.push({
            reason: row.rejectionReason,
            count: parseInt(row.count, 10),
          });
        }
      }

      // Filtra categorie con dati insufficienti (< 3 decisioni)
      const significantCategories = Array.from(categories.entries())
        .filter(([, cat]) => cat.total >= 3)
        .sort((a, b) => a[1].rate - b[1].rate); // Le più rifiutate prima

      if (significantCategories.length === 0) {
        return { systemPrefix: '', userPrefix: '' };
      }

      // System prefix: regole di adattamento
      const systemPrefix = `STORICO DECISIONI UTENTE - REGOLE DI ADATTAMENTO:
Hai accesso allo storico delle decisioni dell'utente su questo account. Usa queste informazioni per calibrare le tue raccomandazioni:

- Per categorie con tasso di approvazione < 30%: RIDUCI drasticamente la priorita o EVITA di generare questo tipo di raccomandazione, a meno che non sia critica per le performance.
- Per categorie con tasso di approvazione tra 30% e 70%: genera con cautela, abbassando la priorita se possibile.
- Per categorie con tasso di approvazione > 70%: genera queste raccomandazioni con fiducia, sono ben accette dall'utente.
- Leggi attentamente i motivi di rifiuto per capire le preferenze dell'utente e NON ripetere errori passati.
- Se l'utente ha espresso preferenze specifiche nei motivi di rifiuto, rispettale sempre.`;

      // User prefix: dati reali per categoria
      const lines: string[] = [];

      for (const [key, cat] of significantCategories) {
        const modType = key.split('::')[1] || key;
        let line = `- ${modType}: approvate ${cat.approved}/${cat.total} (${cat.rate}%)`;

        if (cat.rate < 30) {
          line += " - ATTENZIONE: l'utente raramente accetta questo tipo di modifica";
        } else if (cat.rate > 70) {
          line += " - l'utente gradisce questo tipo di modifica";
        }

        if (cat.topRejectionReasons.length > 0) {
          const reasons = cat.topRejectionReasons
            .map(r => `"${r.reason}"`)
            .join(', ');
          line += `\n  Motivi rifiuto frequenti: ${reasons}`;
        }

        lines.push(line);
      }

      const userPrefix = `STORICO DECISIONI UTENTE PER QUESTO ACCOUNT (ultimi 6 mesi):
${lines.join('\n')}

Adatta le tue raccomandazioni in base a queste preferenze. Non insistere su categorie che l'utente rifiuta sistematicamente.`;

      this.logger.log(`Decision history context: ${significantCategories.length} categorie con dati sufficienti`);

      return { systemPrefix, userPrefix };
    } catch (error) {
      this.logger.warn(`Failed to build decision history context: ${error.message}`);
      return { systemPrefix: '', userPrefix: '' };
    }
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
  ): Promise<{ log: AIAnalysisLog; moduleRecommendations: Array<{ moduleId: number; recommendations: AIRecommendation[] }> }> {
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
    const allModuleRecommendations: Array<{ moduleId: number; recommendations: AIRecommendation[] }> = [];

    // Skip documentation-only modules (3, 5, 6, 8) — no data to fetch from DB
    const actionableModules = SUPPORTED_MODULES.filter(id => !DOCUMENTATION_ONLY_MODULES.includes(id));

    for (const moduleId of actionableModules) {
      try {
        const result = await this.analyzeModule(accountId, moduleId);
        analyzedModules.push(moduleId);
        const recCount = result.recommendations?.length || 0;
        totalRecs += recCount;
        moduleResults[String(moduleId)] = {
          success: true,
          recommendations: recCount,
        };
        if (result.recommendations && result.recommendations.length > 0) {
          allModuleRecommendations.push({
            moduleId,
            recommendations: result.recommendations,
          });
        }
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

    const savedLog = await this.analysisLogRepository.save(log);
    return { log: savedLog, moduleRecommendations: allModuleRecommendations };
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

  // =========================================================================
  // AUDIT REPORT + CHAT
  // =========================================================================

  async generateReport(accountId: string): Promise<AuditReport> {
    const startedAt = Date.now();

    const latestRun = await this.getLatestRun(accountId);
    if (!latestRun) {
      throw new BadRequestException('Nessun dato disponibile per questo account');
    }

    const account = await this.accountRepository.findOne({ where: { id: accountId } });
    if (!account) {
      throw new BadRequestException('Account non trovato');
    }

    // Create report record
    const report = this.auditReportRepository.create({
      accountId,
      status: ReportStatus.GENERATING,
      generatedAt: new Date(),
    });
    await this.auditReportRepository.save(report);

    try {
      // Fetch all data in parallel
      const [campaigns, conversionActions, auditIssues, adGroupCount, keywordCount, adCount] =
        await Promise.all([
          this.campaignRepository.find({
            where: { accountId, runId: latestRun.runId },
          }),
          this.conversionActionRepository.find({
            where: { accountId, runId: latestRun.runId },
          }),
          this.auditIssueRepository.find({
            where: { accountId },
            order: { severity: 'ASC' },
          }),
          this.adGroupRepository.count({ where: { accountId, runId: latestRun.runId } }),
          this.keywordRepository.count({ where: { accountId, runId: latestRun.runId } }),
          this.adRepository.count({ where: { accountId, runId: latestRun.runId } }),
        ]);

      // Aggregate KPIs from campaigns
      const enabledCampaigns = campaigns.filter((c) => c.status === 'ENABLED');
      const totalCost = enabledCampaigns.reduce((sum, c) => sum + (parseInt(c.costMicros) || 0), 0);
      const totalImpressions = enabledCampaigns.reduce((sum, c) => sum + (parseInt(c.impressions) || 0), 0);
      const totalClicks = enabledCampaigns.reduce((sum, c) => sum + (parseInt(c.clicks) || 0), 0);
      const totalConversions = enabledCampaigns.reduce((sum, c) => sum + (parseFloat(c.conversions) || 0), 0);
      const totalConversionsValue = enabledCampaigns.reduce((sum, c) => sum + (parseFloat(c.conversionsValue) || 0), 0);
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCpa = totalConversions > 0 ? totalCost / 1_000_000 / totalConversions : 0;
      const roas = totalCost > 0 ? (totalConversionsValue * 1_000_000) / totalCost : 0;

      // Summarize issues
      const issuesBySeverity: Record<string, number> = {};
      const issuesByCategory: Record<string, number> = {};
      for (const issue of auditIssues) {
        issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
        issuesByCategory[issue.category] = (issuesByCategory[issue.category] || 0) + 1;
      }

      // Build data context for the prompt
      const dataContext = `
ACCOUNT: ${account.customerName} (ID: ${account.customerId})

KPI PRINCIPALI (periodo analizzato):
- Costo totale: €${(totalCost / 1_000_000).toFixed(2)}
- Impressioni: ${totalImpressions.toLocaleString('it-IT')}
- Click: ${totalClicks.toLocaleString('it-IT')}
- CTR medio: ${avgCtr.toFixed(2)}%
- Conversioni: ${totalConversions.toFixed(1)}
- Valore conversioni: €${totalConversionsValue.toFixed(2)}
- CPA medio: €${avgCpa.toFixed(2)}
- ROAS: ${roas.toFixed(2)}

STRUTTURA ACCOUNT:
- Campagne totali: ${campaigns.length} (${enabledCampaigns.length} attive)
- Ad Group: ${adGroupCount}
- Keyword: ${keywordCount}
- Annunci: ${adCount}

CAMPAGNE ATTIVE:
${enabledCampaigns
  .slice(0, 20)
  .map(
    (c) =>
      `- ${c.campaignName}: €${(parseInt(c.costMicros) / 1_000_000).toFixed(2)} spesa, ${c.clicks} click, ${parseFloat(c.conversions).toFixed(1)} conv, ${c.advertisingChannelType}, ${c.biddingStrategyType}`,
  )
  .join('\n')}

AZIONI DI CONVERSIONE (${conversionActions.length}):
${conversionActions
  .map(
    (ca) =>
      `- ${ca.name}: status=${ca.status}, tipo=${ca.type}, primaria=${ca.primaryForGoal ? 'SI' : 'NO'}, valore=€${parseFloat(ca.defaultValue || '0').toFixed(2)}`,
  )
  .join('\n')}

PROBLEMI RILEVATI (${auditIssues.length} totali):
Per severità: ${Object.entries(issuesBySeverity).map(([k, v]) => `${k}: ${v}`).join(', ')}
Per categoria: ${Object.entries(issuesByCategory).map(([k, v]) => `${k}: ${v}`).join(', ')}

TOP PROBLEMI:
${auditIssues
  .slice(0, 15)
  .map((i) => `- [${i.severity.toUpperCase()}] ${i.title}: ${i.description}`)
  .join('\n')}
`.trim();

      const systemPrompt = `Sei un esperto Google Ads Specialist senior con oltre 10 anni di esperienza. Genera un REPORT DI AUDIT completo e professionale in italiano per l'account Google Ads analizzato.

Il report deve essere:
- DISCORSIVO e narrativo, non una semplice lista puntata
- Coprire sia gli ASPETTI POSITIVI che NEGATIVI dell'account
- Basato sui DATI CONCRETI forniti
- Strutturato in sezioni chiare con heading markdown (##)
- Professionale ma comprensibile anche per chi non è un esperto

STRUTTURA OBBLIGATORIA DEL REPORT:

## Panoramica Account
Breve overview delle performance generali. Punti di forza e debolezze principali in 2-3 paragrafi.

## Performance e KPI
Analisi delle metriche principali: impressioni, click, CTR, costo, conversioni, CPA, ROAS. Confronta con i benchmark di settore (CTR medio search ~3-5%, CPA dipende dal settore). Evidenzia cosa va bene e cosa no.

## Configurazione Conversioni
Stato delle azioni di conversione configurate. Sono correttamente impostate? Ci sono problemi (conversioni nascoste, non primarie, senza valore)? Suggerimenti specifici.

## Problemi Critici
I problemi più gravi che richiedono attenzione immediata. Per ognuno spiega il PERCHÉ è un problema e COSA fare per risolverlo.

## Aree di Miglioramento
Suggerimenti concreti per migliorare le performance, organizzati per priorità. Sii specifico e pratico.

## Aspetti Positivi
Cosa funziona bene nell'account e va mantenuto o potenziato. È importante riconoscere anche i successi.

## Conclusioni e Priorità
Riepilogo con le 3-5 azioni prioritarie da intraprendere, in ordine di importanza.

REGOLE:
- Scrivi in italiano professionale
- Usa dati concreti dai numeri forniti
- Non inventare dati che non hai
- Sii onesto: se qualcosa non va, dillo chiaramente
- Se i dati sono insufficienti per un giudizio, specificalo
- Usa **grassetto** per enfatizzare i punti importanti`;

      const openai = await this.getOpenAIClient();
      const content = await this.callOpenAIText(openai, systemPrompt, dataContext);

      const durationMs = Date.now() - startedAt;

      report.content = content;
      report.status = ReportStatus.COMPLETED;
      report.durationMs = durationMs;
      report.metadata = {
        campaignCount: campaigns.length,
        issueCount: auditIssues.length,
        conversionActionCount: conversionActions.length,
        runId: latestRun.runId,
      };
      await this.auditReportRepository.save(report);

      this.logger.log(`Report generated for account ${accountId} in ${durationMs}ms`);
      return report;
    } catch (error) {
      report.status = ReportStatus.FAILED;
      report.metadata = { error: error.message };
      await this.auditReportRepository.save(report);
      throw new BadRequestException(`Generazione report fallita: ${error.message}`);
    }
  }

  async getLatestReport(accountId: string): Promise<AuditReport | null> {
    return this.auditReportRepository.findOne({
      where: { accountId, status: ReportStatus.COMPLETED },
      order: { generatedAt: 'DESC' },
    });
  }

  async chatWithReport(
    accountId: string,
    userMessage: string,
  ): Promise<AuditReportMessage> {
    const report = await this.getLatestReport(accountId);
    if (!report) {
      throw new BadRequestException('Nessun report disponibile. Genera prima un report.');
    }

    // Save user message
    const userMsg = this.auditReportMessageRepository.create({
      reportId: report.id,
      role: 'user' as const,
      content: userMessage,
    });
    await this.auditReportMessageRepository.save(userMsg);

    // Get recent messages for context
    const recentMessages = await this.auditReportMessageRepository.find({
      where: { reportId: report.id },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    // Build chat messages for OpenAI
    const systemPrompt = `Sei un esperto Google Ads Specialist senior. Hai generato il seguente report di audit per un account Google Ads. Rispondi alle domande dell'utente basandoti sul report e sulla tua esperienza.

REPORT DI AUDIT:
${(report.content || '').substring(0, 8000)}

REGOLE:
- Rispondi in italiano
- Sii specifico e pratico
- Se la domanda non è coperta dal report, rispondi comunque basandoti sulla tua esperienza
- Mantieni un tono professionale ma accessibile`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add recent message history (exclude the just-saved user message, we add it at the end)
    for (const msg of recentMessages) {
      if (msg.id === userMsg.id) continue;
      messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    const openai = await this.getOpenAIClient();
    let model = await this.settingsService.getOpenAIModel();
    if (!model) {
      model = this.configService.get<string>('ai.openaiModel') || 'gpt-4o';
    }

    const isGpt5 = model.startsWith('gpt-5');
    const response = await openai.chat.completions.create({
      model,
      messages,
      ...(isGpt5 ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }),
      temperature: 0.4,
    });

    const assistantContent = response.choices[0]?.message?.content || 'Mi dispiace, non sono riuscito a generare una risposta.';

    // Save assistant message
    const assistantMsg = this.auditReportMessageRepository.create({
      reportId: report.id,
      role: 'assistant' as const,
      content: assistantContent,
    });
    await this.auditReportMessageRepository.save(assistantMsg);

    return assistantMsg;
  }

  async getReportMessages(accountId: string): Promise<AuditReportMessage[]> {
    const report = await this.getLatestReport(accountId);
    if (!report) return [];

    return this.auditReportMessageRepository.find({
      where: { reportId: report.id },
      order: { createdAt: 'ASC' },
    });
  }

  private async callOpenAIText(
    openai: OpenAI,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    let model = await this.settingsService.getOpenAIModel();
    if (!model) {
      model = this.configService.get<string>('ai.openaiModel') || 'gpt-4o';
    }

    const isGpt5 = model.startsWith('gpt-5');

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(isGpt5 ? { max_completion_tokens: 8192 } : { max_tokens: 8192 }),
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content;
  }
}
