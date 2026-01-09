import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditIssue,
  IssueSeverity,
  IssueCategory,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
  SearchTerm,
  NegativeKeyword,
} from '../../entities';

interface RuleContext {
  accountId: string;
  runId: string;
}

interface IssueData {
  ruleId: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  category: IssueCategory;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  potentialSavings?: number;
  potentialGain?: number;
  affectedImpressions?: number;
  affectedClicks?: number;
  affectedCost?: number;
  recommendation?: string;
  actionSteps?: string[];
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditRulesService {
  private readonly logger = new Logger(AuditRulesService.name);

  constructor(
    @InjectRepository(AuditIssue)
    private readonly issueRepository: Repository<AuditIssue>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(AdGroup)
    private readonly adGroupRepository: Repository<AdGroup>,
    @InjectRepository(Ad)
    private readonly adRepository: Repository<Ad>,
    @InjectRepository(Keyword)
    private readonly keywordRepository: Repository<Keyword>,
    @InjectRepository(SearchTerm)
    private readonly searchTermRepository: Repository<SearchTerm>,
    @InjectRepository(NegativeKeyword)
    private readonly negativeKeywordRepository: Repository<NegativeKeyword>,
  ) {}

  /**
   * Run all audit rules for an account/run
   */
  async runAllRules(accountId: string, runId: string): Promise<number> {
    const ctx: RuleContext = { accountId, runId };
    this.logger.log(`Running audit rules for account ${accountId}, run ${runId}`);

    // Delete existing issues for this run
    await this.issueRepository.delete({ accountId, runId });

    const issues: IssueData[] = [];

    // Run all rule categories
    issues.push(...(await this.runCampaignRules(ctx)));
    issues.push(...(await this.runAdGroupRules(ctx)));
    issues.push(...(await this.runKeywordRules(ctx)));
    issues.push(...(await this.runAdRules(ctx)));
    issues.push(...(await this.runSearchTermRules(ctx)));
    issues.push(...(await this.runStructureRules(ctx)));

    // Save all issues
    if (issues.length > 0) {
      const entities = issues.map((issue) =>
        this.issueRepository.create({
          accountId,
          runId,
          ...issue,
          actionSteps: issue.actionSteps ? JSON.stringify(issue.actionSteps) : null,
        }),
      );
      await this.issueRepository.save(entities);
    }

    this.logger.log(`Found ${issues.length} issues for account ${accountId}`);
    return issues.length;
  }

  // ==========================================================================
  // CAMPAIGN RULES
  // ==========================================================================

  private async runCampaignRules(ctx: RuleContext): Promise<IssueData[]> {
    const issues: IssueData[] = [];
    const campaigns = await this.campaignRepository.find({
      where: { accountId: ctx.accountId, runId: ctx.runId },
    });

    for (const campaign of campaigns) {
      const impressions = parseInt(campaign.impressions) || 0;
      const clicks = parseInt(campaign.clicks) || 0;
      const cost = parseInt(campaign.costMicros) || 0;
      const conversions = parseFloat(campaign.conversions) || 0;
      const ctr = parseFloat(campaign.ctr) || 0;

      // RULE: Campaign with high spend but no conversions
      if (cost > 100_000_000 && conversions === 0) {
        // > €100 without conversions
        issues.push({
          ruleId: 'CAMP_NO_CONV_HIGH_SPEND',
          title: 'Campagna con spesa elevata senza conversioni',
          description: `La campagna "${campaign.campaignName}" ha speso €${(cost / 1_000_000).toFixed(2)} senza generare conversioni.`,
          severity: 'critical',
          category: 'performance',
          entityType: 'campaign',
          entityId: campaign.campaignId,
          entityName: campaign.campaignName,
          affectedCost: cost / 1_000_000,
          potentialSavings: cost / 1_000_000,
          recommendation: 'Verifica il tracciamento delle conversioni o considera di mettere in pausa la campagna.',
          actionSteps: [
            'Verifica che il tracciamento conversioni sia configurato correttamente',
            'Controlla le impostazioni di targeting',
            'Valuta se mettere in pausa la campagna',
          ],
        });
      }

      // RULE: Very low CTR
      if (impressions > 1000 && ctr < 1) {
        issues.push({
          ruleId: 'CAMP_LOW_CTR',
          title: 'CTR molto basso',
          description: `La campagna "${campaign.campaignName}" ha un CTR del ${ctr.toFixed(2)}%, significativamente sotto la media.`,
          severity: 'high',
          category: 'performance',
          entityType: 'campaign',
          entityId: campaign.campaignId,
          entityName: campaign.campaignName,
          affectedImpressions: impressions,
          affectedClicks: clicks,
          recommendation: 'Migliora gli annunci e rivedi il targeting per aumentare il CTR.',
          actionSteps: [
            'Rivedi e migliora i testi degli annunci',
            'Aggiungi estensioni annuncio',
            'Verifica la pertinenza delle keyword',
          ],
        });
      }

      // RULE: High impression share lost to budget
      // Data is stored as decimal (0.21 = 21%), convert to percentage
      const isLostBudgetRaw = parseFloat(campaign.searchImpressionShareLostBudget || '0') || 0;
      const isLostBudget = isLostBudgetRaw > 1 ? isLostBudgetRaw : isLostBudgetRaw * 100; // Handle both formats
      if (isLostBudget > 20) {
        issues.push({
          ruleId: 'CAMP_IS_LOST_BUDGET',
          title: 'Quota impressioni persa per budget',
          description: `La campagna "${campaign.campaignName}" sta perdendo il ${isLostBudget.toFixed(1)}% delle impressioni a causa del budget limitato.`,
          severity: isLostBudget > 50 ? 'high' : 'medium',
          category: 'budget',
          entityType: 'campaign',
          entityId: campaign.campaignId,
          entityName: campaign.campaignName,
          affectedImpressions: Math.round(impressions * (isLostBudget / 100)),
          recommendation: 'Considera di aumentare il budget giornaliero per catturare più traffico.',
          actionSteps: [
            'Valuta il ROI attuale della campagna',
            'Se profittevole, aumenta il budget',
            'Altrimenti, ottimizza per ridurre CPC',
          ],
          metadata: { impressionShareLostBudget: isLostBudget },
        });
      }

      // RULE: High impression share lost to rank
      // Data is stored as decimal (0.44 = 44%), convert to percentage
      const isLostRankRaw = parseFloat(campaign.searchImpressionShareLostRank || '0') || 0;
      const isLostRank = isLostRankRaw > 1 ? isLostRankRaw : isLostRankRaw * 100; // Handle both formats
      if (isLostRank > 30) {
        issues.push({
          ruleId: 'CAMP_IS_LOST_RANK',
          title: 'Quota impressioni persa per ranking',
          description: `La campagna "${campaign.campaignName}" sta perdendo il ${isLostRank.toFixed(1)}% delle impressioni a causa del ranking basso.`,
          severity: isLostRank > 50 ? 'high' : 'medium',
          category: 'quality',
          entityType: 'campaign',
          entityId: campaign.campaignId,
          entityName: campaign.campaignName,
          recommendation: 'Migliora il Quality Score o aumenta le offerte.',
          actionSteps: [
            'Migliora la pertinenza degli annunci',
            'Ottimizza le landing page',
            'Considera di aumentare le offerte',
          ],
          metadata: { impressionShareLostRank: isLostRank },
        });
      }

      // RULE: Paused campaign with recent spend
      if (campaign.status === 'PAUSED' && cost > 0) {
        issues.push({
          ruleId: 'CAMP_PAUSED_WITH_DATA',
          title: 'Campagna in pausa con dati recenti',
          description: `La campagna "${campaign.campaignName}" è in pausa ma ha dati nel periodo analizzato.`,
          severity: 'info',
          category: 'structure',
          entityType: 'campaign',
          entityId: campaign.campaignId,
          entityName: campaign.campaignName,
          recommendation: 'Valuta se riattivare la campagna o se è stata messa in pausa intenzionalmente.',
        });
      }
    }

    return issues;
  }

  // ==========================================================================
  // AD GROUP RULES
  // ==========================================================================

  private async runAdGroupRules(ctx: RuleContext): Promise<IssueData[]> {
    const issues: IssueData[] = [];
    const adGroups = await this.adGroupRepository.find({
      where: { accountId: ctx.accountId, runId: ctx.runId },
    });

    for (const adGroup of adGroups) {
      const impressions = parseInt(adGroup.impressions) || 0;
      const conversions = parseFloat(adGroup.conversions) || 0;
      const cost = parseInt(adGroup.costMicros) || 0;

      // RULE: Ad group with spend but no impressions (data issue)
      if (cost > 0 && impressions === 0) {
        issues.push({
          ruleId: 'AG_SPEND_NO_IMPR',
          title: 'Ad Group con spesa ma senza impressioni',
          description: `L'ad group "${adGroup.adGroupName}" mostra spesa senza impressioni - possibile problema dati.`,
          severity: 'low',
          category: 'structure',
          entityType: 'adGroup',
          entityId: adGroup.adGroupId,
          entityName: adGroup.adGroupName,
          recommendation: 'Verifica i dati o controlla le impostazioni dell\'ad group.',
        });
      }

      // RULE: High spend low conversion ad group
      if (cost > 50_000_000 && conversions < 1) {
        issues.push({
          ruleId: 'AG_HIGH_SPEND_LOW_CONV',
          title: 'Ad Group con spesa alta e poche conversioni',
          description: `L'ad group "${adGroup.adGroupName}" ha speso €${(cost / 1_000_000).toFixed(2)} con meno di 1 conversione.`,
          severity: 'high',
          category: 'performance',
          entityType: 'adGroup',
          entityId: adGroup.adGroupId,
          entityName: adGroup.adGroupName,
          affectedCost: cost / 1_000_000,
          potentialSavings: cost / 1_000_000 * 0.5,
          recommendation: 'Rivedi le keyword e gli annunci di questo ad group.',
          actionSteps: [
            'Analizza le keyword con più spesa',
            'Verifica la pertinenza degli annunci',
            'Considera di mettere in pausa o ristrutturare',
          ],
        });
      }
    }

    return issues;
  }

  // ==========================================================================
  // KEYWORD RULES
  // ==========================================================================

  private async runKeywordRules(ctx: RuleContext): Promise<IssueData[]> {
    const issues: IssueData[] = [];
    const keywords = await this.keywordRepository.find({
      where: { accountId: ctx.accountId, runId: ctx.runId },
    });

    let lowQsCount = 0;
    let lowQsTotalCost = 0;

    for (const keyword of keywords) {
      const qs = keyword.qualityScore;
      const impressions = parseInt(keyword.impressions) || 0;
      const clicks = parseInt(keyword.clicks) || 0;
      const cost = parseInt(keyword.costMicros) || 0;
      const conversions = parseFloat(keyword.conversions) || 0;

      // RULE: Low Quality Score with significant spend
      if (qs !== null && qs < 5 && cost > 10_000_000) {
        lowQsCount++;
        lowQsTotalCost += cost;

        issues.push({
          ruleId: 'KW_LOW_QS',
          title: 'Keyword con Quality Score basso',
          description: `La keyword "${keyword.keywordText}" ha QS ${qs}/10 e ha speso €${(cost / 1_000_000).toFixed(2)}.`,
          severity: qs <= 3 ? 'high' : 'medium',
          category: 'quality',
          entityType: 'keyword',
          entityId: keyword.keywordId,
          entityName: keyword.keywordText,
          affectedCost: cost / 1_000_000,
          potentialSavings: (cost / 1_000_000) * 0.3, // Could save ~30% with better QS
          recommendation: 'Migliora la pertinenza annuncio-keyword-landing page.',
          actionSteps: [
            `Landing page experience: ${keyword.landingPageExperience}`,
            `Ad relevance: ${keyword.creativeRelevance}`,
            `Expected CTR: ${keyword.expectedCtr}`,
            'Crea annunci più pertinenti per questa keyword',
            'Ottimizza la landing page',
          ],
          metadata: {
            qualityScore: qs,
            landingPageExperience: keyword.landingPageExperience,
            adRelevance: keyword.creativeRelevance,
            expectedCtr: keyword.expectedCtr,
          },
        });
      }

      // RULE: High spend keyword without conversions
      if (cost > 50_000_000 && conversions === 0 && clicks > 10) {
        issues.push({
          ruleId: 'KW_NO_CONV_HIGH_SPEND',
          title: 'Keyword costosa senza conversioni',
          description: `La keyword "${keyword.keywordText}" ha speso €${(cost / 1_000_000).toFixed(2)} senza conversioni.`,
          severity: 'critical',
          category: 'performance',
          entityType: 'keyword',
          entityId: keyword.keywordId,
          entityName: keyword.keywordText,
          affectedCost: cost / 1_000_000,
          affectedClicks: clicks,
          potentialSavings: cost / 1_000_000,
          recommendation: 'Valuta se mettere in pausa questa keyword o aggiungere come negativa.',
          actionSteps: [
            'Verifica l\'intento di ricerca',
            'Controlla la landing page',
            'Considera di mettere in pausa',
          ],
        });
      }

      // RULE: Broad match with high spend
      if (keyword.matchType === 'BROAD' && cost > 100_000_000) {
        issues.push({
          ruleId: 'KW_BROAD_HIGH_SPEND',
          title: 'Keyword broad match con alta spesa',
          description: `La keyword broad "${keyword.keywordText}" ha speso €${(cost / 1_000_000).toFixed(2)}.`,
          severity: 'medium',
          category: 'targeting',
          entityType: 'keyword',
          entityId: keyword.keywordId,
          entityName: keyword.keywordText,
          affectedCost: cost / 1_000_000,
          recommendation: 'Analizza i search terms e considera match type più restrittivi.',
          actionSteps: [
            'Analizza i search terms attivati',
            'Aggiungi negative keywords appropriate',
            'Valuta se usare phrase o exact match',
          ],
        });
      }
    }

    // Aggregate issue for many low QS keywords
    if (lowQsCount > 10) {
      issues.push({
        ruleId: 'KW_MANY_LOW_QS',
        title: 'Molte keyword con Quality Score basso',
        description: `${lowQsCount} keyword hanno QS < 5, con una spesa totale di €${(lowQsTotalCost / 1_000_000).toFixed(2)}.`,
        severity: 'high',
        category: 'quality',
        potentialSavings: (lowQsTotalCost / 1_000_000) * 0.2,
        recommendation: 'È necessaria un\'ottimizzazione sistematica del Quality Score.',
        actionSteps: [
          'Rivedi la struttura degli ad group',
          'Migliora la pertinenza degli annunci',
          'Ottimizza le landing page',
        ],
        metadata: { lowQsKeywordCount: lowQsCount, totalCost: lowQsTotalCost / 1_000_000 },
      });
    }

    return issues;
  }

  // ==========================================================================
  // AD RULES
  // ==========================================================================

  private async runAdRules(ctx: RuleContext): Promise<IssueData[]> {
    const issues: IssueData[] = [];
    const ads = await this.adRepository.find({
      where: { accountId: ctx.accountId, runId: ctx.runId },
    });

    let poorAdsCount = 0;
    let averageAdsCount = 0;

    for (const ad of ads) {
      const impressions = parseInt(ad.impressions) || 0;

      // RULE: Poor ad strength with impressions
      if (ad.adStrength === 'POOR' && impressions > 100) {
        poorAdsCount++;
        issues.push({
          ruleId: 'AD_POOR_STRENGTH',
          title: 'Annuncio con efficacia "Poor"',
          description: `Un annuncio nel gruppo "${ad.adGroupName}" ha efficacia scarsa.`,
          severity: 'medium',
          category: 'quality',
          entityType: 'ad',
          entityId: ad.adId,
          entityName: ad.adGroupName,
          affectedImpressions: impressions,
          recommendation: 'Migliora l\'annuncio aggiungendo più headline e descrizioni.',
          actionSteps: [
            'Aggiungi più headline (almeno 10)',
            'Aggiungi più descrizioni (almeno 4)',
            'Usa parole chiave nei testi',
          ],
          metadata: { adStrength: ad.adStrength, headlineCount: ad.headlines?.length },
        });
      }

      if (ad.adStrength === 'AVERAGE') {
        averageAdsCount++;
      }

      // RULE: Disapproved ad
      if (ad.approvalStatus === 'DISAPPROVED') {
        issues.push({
          ruleId: 'AD_DISAPPROVED',
          title: 'Annuncio non approvato',
          description: `Un annuncio nel gruppo "${ad.adGroupName}" non è stato approvato.`,
          severity: 'high',
          category: 'structure',
          entityType: 'ad',
          entityId: ad.adId,
          entityName: ad.adGroupName,
          recommendation: 'Rivedi le policy e correggi l\'annuncio.',
          actionSteps: [
            'Verifica il motivo della disapprovazione',
            'Correggi i problemi identificati',
            'Richiedi una nuova revisione',
          ],
        });
      }

      // RULE: Few headlines in RSA
      if (ad.adType === 'RESPONSIVE_SEARCH_AD' && ad.headlines && ad.headlines.length < 8) {
        issues.push({
          ruleId: 'AD_FEW_HEADLINES',
          title: 'RSA con poche headline',
          description: `Un annuncio RSA nel gruppo "${ad.adGroupName}" ha solo ${ad.headlines.length} headline.`,
          severity: 'low',
          category: 'quality',
          entityType: 'ad',
          entityId: ad.adId,
          entityName: ad.adGroupName,
          recommendation: 'Aggiungi più headline per migliorare le performance.',
          actionSteps: ['Aggiungi headline fino ad arrivare a 15', 'Varia i messaggi e le CTA'],
          metadata: { headlineCount: ad.headlines.length },
        });
      }
    }

    // Aggregate issue for many poor/average ads
    if (poorAdsCount > 5) {
      issues.push({
        ruleId: 'AD_MANY_POOR',
        title: 'Molti annunci con efficacia scarsa',
        description: `${poorAdsCount} annunci hanno efficacia "Poor".`,
        severity: 'high',
        category: 'quality',
        recommendation: 'Migliora sistematicamente gli annunci RSA.',
      });
    }

    return issues;
  }

  // ==========================================================================
  // SEARCH TERM RULES
  // ==========================================================================

  private async runSearchTermRules(ctx: RuleContext): Promise<IssueData[]> {
    const issues: IssueData[] = [];
    const searchTerms = await this.searchTermRepository.find({
      where: { accountId: ctx.accountId, runId: ctx.runId },
    });

    let wastefulTermsCount = 0;
    let wastefulTermsCost = 0;
    const wastefulTermsList: string[] = [];

    for (const st of searchTerms) {
      const cost = parseInt(st.costMicros) || 0;
      const conversions = parseFloat(st.conversions) || 0;
      const clicks = parseInt(st.clicks) || 0;

      // RULE: Search term with high spend, no conversions
      if (cost > 20_000_000 && conversions === 0 && clicks > 5) {
        wastefulTermsCount++;
        wastefulTermsCost += cost;
        if (wastefulTermsList.length < 10) {
          wastefulTermsList.push(st.searchTerm);
        }

        if (cost > 50_000_000) {
          // Only create individual issues for very expensive terms
          issues.push({
            ruleId: 'ST_NO_CONV_HIGH_SPEND',
            title: 'Search term costoso senza conversioni',
            description: `Il search term "${st.searchTerm}" ha speso €${(cost / 1_000_000).toFixed(2)} senza conversioni.`,
            severity: 'high',
            category: 'targeting',
            entityType: 'searchTerm',
            entityId: st.id,
            entityName: st.searchTerm,
            affectedCost: cost / 1_000_000,
            affectedClicks: clicks,
            potentialSavings: cost / 1_000_000,
            recommendation: 'Considera di aggiungere questo termine come keyword negativa.',
            actionSteps: [
              'Analizza l\'intento di ricerca',
              'Se non pertinente, aggiungi come negativa',
              'Se pertinente, ottimizza la landing page',
            ],
          });
        }
      }
    }

    // Aggregate issue for wasteful search terms
    if (wastefulTermsCount > 5) {
      issues.push({
        ruleId: 'ST_MANY_WASTEFUL',
        title: 'Molti search terms non convertono',
        description: `${wastefulTermsCount} search terms hanno speso €${(wastefulTermsCost / 1_000_000).toFixed(2)} senza conversioni.`,
        severity: 'high',
        category: 'targeting',
        potentialSavings: wastefulTermsCost / 1_000_000,
        recommendation: 'Rivedi i search terms e aggiungi negative keywords.',
        actionSteps: [
          'Analizza i search terms con più spesa',
          'Crea una lista di negative keywords',
          'Applica la lista alle campagne appropriate',
        ],
        metadata: {
          wastefulTermsCount,
          totalCost: wastefulTermsCost / 1_000_000,
          sampleTerms: wastefulTermsList,
        },
      });
    }

    return issues;
  }

  // ==========================================================================
  // STRUCTURE RULES
  // ==========================================================================

  private async runStructureRules(ctx: RuleContext): Promise<IssueData[]> {
    const issues: IssueData[] = [];

    // Check for ad groups without active ads
    const adGroupsWithoutAds = await this.adGroupRepository
      .createQueryBuilder('ag')
      .where('ag.accountId = :accountId', { accountId: ctx.accountId })
      .andWhere('ag.runId = :runId', { runId: ctx.runId })
      .andWhere('ag.status = :status', { status: 'ENABLED' })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(Ad, 'a')
          .where('a.adGroupId = ag.adGroupId')
          .andWhere('a.runId = ag.runId')
          .andWhere("a.status = 'ENABLED'")
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      })
      .getMany();

    for (const ag of adGroupsWithoutAds) {
      issues.push({
        ruleId: 'STRUCT_AG_NO_ADS',
        title: 'Ad Group attivo senza annunci attivi',
        description: `L'ad group "${ag.adGroupName}" è attivo ma non ha annunci attivi.`,
        severity: 'high',
        category: 'structure',
        entityType: 'adGroup',
        entityId: ag.adGroupId,
        entityName: ag.adGroupName,
        recommendation: 'Aggiungi almeno un annuncio attivo a questo ad group.',
      });
    }

    // Check for ad groups without keywords (for Search campaigns)
    const adGroupsWithoutKeywords = await this.adGroupRepository
      .createQueryBuilder('ag')
      .where('ag.accountId = :accountId', { accountId: ctx.accountId })
      .andWhere('ag.runId = :runId', { runId: ctx.runId })
      .andWhere('ag.status = :status', { status: 'ENABLED' })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(Keyword, 'k')
          .where('k.adGroupId = ag.adGroupId')
          .andWhere('k.runId = ag.runId')
          .andWhere("k.status = 'ENABLED'")
          .getQuery();
        return `NOT EXISTS ${subQuery}`;
      })
      .getMany();

    if (adGroupsWithoutKeywords.length > 0 && adGroupsWithoutKeywords.length < 20) {
      for (const ag of adGroupsWithoutKeywords) {
        issues.push({
          ruleId: 'STRUCT_AG_NO_KW',
          title: 'Ad Group attivo senza keyword attive',
          description: `L'ad group "${ag.adGroupName}" è attivo ma non ha keyword attive.`,
          severity: 'medium',
          category: 'structure',
          entityType: 'adGroup',
          entityId: ag.adGroupId,
          entityName: ag.adGroupName,
          recommendation: 'Aggiungi keyword a questo ad group o disattivalo.',
        });
      }
    }

    // Check negative keyword coverage
    const negativeCount = await this.negativeKeywordRepository.count({
      where: { accountId: ctx.accountId, runId: ctx.runId },
    });

    const searchTermCount = await this.searchTermRepository.count({
      where: { accountId: ctx.accountId, runId: ctx.runId },
    });

    if (searchTermCount > 100 && negativeCount < 20) {
      issues.push({
        ruleId: 'STRUCT_FEW_NEGATIVES',
        title: 'Poche keyword negative',
        description: `L'account ha ${searchTermCount} search terms ma solo ${negativeCount} keyword negative.`,
        severity: 'medium',
        category: 'targeting',
        recommendation: 'Analizza i search terms e aggiungi keyword negative appropriate.',
        actionSteps: [
          'Rivedi i search terms con peggiori performance',
          'Identifica termini non pertinenti',
          'Crea liste di negative keywords condivise',
        ],
        metadata: { searchTermCount, negativeKeywordCount: negativeCount },
      });
    }

    return issues;
  }

  // ==========================================================================
  // SUMMARY METHODS
  // ==========================================================================

  async getIssueSummary(
    accountId: string,
    runId?: string,
  ): Promise<{
    total: number;
    bySeverity: Record<IssueSeverity, number>;
    byCategory: Record<IssueCategory, number>;
    potentialSavings: number;
  }> {
    const qb = this.issueRepository.createQueryBuilder('i');
    qb.where('i.accountId = :accountId', { accountId });
    if (runId) {
      qb.andWhere('i.runId = :runId', { runId });
    }

    const issues = await qb.getMany();

    const bySeverity: Record<IssueSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const byCategory: Record<IssueCategory, number> = {
      performance: 0,
      quality: 0,
      structure: 0,
      budget: 0,
      targeting: 0,
      conversion: 0,
      opportunity: 0,
    };

    let potentialSavings = 0;

    for (const issue of issues) {
      bySeverity[issue.severity]++;
      byCategory[issue.category]++;
      potentialSavings += issue.potentialSavings || 0;
    }

    return {
      total: issues.length,
      bySeverity,
      byCategory,
      potentialSavings,
    };
  }
}
