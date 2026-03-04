import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  LandingPageBrief,
  LandingPageBriefStatus,
  Keyword,
  GoogleAdsAccount,
  ImportRun,
} from '../../entities';
import { SettingsService } from '../settings/settings.service';
import { ScraperService } from './scraper.service';

@Injectable()
export class LandingPagesService {
  private readonly logger = new Logger(LandingPagesService.name);

  constructor(
    @InjectRepository(LandingPageBrief)
    private readonly briefRepository: Repository<LandingPageBrief>,
    @InjectRepository(Keyword)
    private readonly keywordRepository: Repository<Keyword>,
    @InjectRepository(GoogleAdsAccount)
    private readonly accountRepository: Repository<GoogleAdsAccount>,
    @InjectRepository(ImportRun)
    private readonly importRunRepository: Repository<ImportRun>,
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
    private readonly scraperService: ScraperService,
  ) {}

  private async getOpenAIClient(): Promise<OpenAI> {
    let apiKey = await this.settingsService.getOpenAIApiKey();
    if (!apiKey) {
      apiKey = this.configService.get<string>('ai.openaiApiKey') ?? null;
    }
    if (!apiKey) {
      throw new BadRequestException(
        'OpenAI API key not configured. Please configure it in Settings > AI.',
      );
    }
    return new OpenAI({ apiKey });
  }

  private async getLatestRunId(accountId: string): Promise<string | null> {
    const run = await this.importRunRepository.findOne({
      where: { accountId, status: 'completed' as any },
      order: { completedAt: 'DESC' },
    });
    return run?.runId || null;
  }

  // =========================================================================
  // CRUD
  // =========================================================================

  async listBriefs(accountId: string): Promise<LandingPageBrief[]> {
    return this.briefRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
    });
  }

  async getBrief(id: string): Promise<LandingPageBrief> {
    const brief = await this.briefRepository.findOne({ where: { id } });
    if (!brief) throw new NotFoundException('Brief not found');
    return brief;
  }

  async createBrief(data: {
    accountId: string;
    name: string;
    sourceUrl?: string;
    primaryKeyword?: string;
    keywordCluster?: LandingPageBrief['keywordCluster'];
  }): Promise<LandingPageBrief> {
    const brief = this.briefRepository.create({
      accountId: data.accountId,
      name: data.name,
      sourceUrl: data.sourceUrl,
      primaryKeyword: data.primaryKeyword,
      keywordCluster: data.keywordCluster,
      status: LandingPageBriefStatus.DRAFT,
    });
    return this.briefRepository.save(brief);
  }

  async updateBrief(
    id: string,
    data: Partial<Pick<LandingPageBrief, 'name' | 'notes' | 'status' | 'brief' | 'sourceUrl'>>,
  ): Promise<LandingPageBrief> {
    const brief = await this.getBrief(id);
    Object.assign(brief, data);
    return this.briefRepository.save(brief);
  }

  async deleteBrief(id: string): Promise<void> {
    const brief = await this.getBrief(id);
    await this.briefRepository.remove(brief);
  }

  // =========================================================================
  // SCRAPE
  // =========================================================================

  async scrapeSourceUrl(id: string): Promise<LandingPageBrief> {
    const brief = await this.getBrief(id);
    if (!brief.sourceUrl) {
      throw new BadRequestException('No source URL configured for this brief');
    }

    const scrapedContent = await this.scraperService.scrapeUrl(brief.sourceUrl);
    brief.scrapedContent = scrapedContent;
    return this.briefRepository.save(brief);
  }

  // =========================================================================
  // KEYWORD CLUSTERING (AI)
  // =========================================================================

  async generateClusters(accountId: string): Promise<{
    clusters: {
      topic: string;
      primaryKeyword: string;
      keywords: {
        keywordText: string;
        keywordId: string;
        impressions: number;
        clicks: number;
        cost: number;
        conversions: number;
        qualityScore: number;
        matchType: string;
        finalUrl: string;
      }[];
      currentUrl: string;
      avgQualityScore: number;
      totalCost: number;
      totalConversions: number;
    }[];
  }> {
    const runId = await this.getLatestRunId(accountId);
    if (!runId) {
      throw new BadRequestException('No import data available for this account');
    }

    // Get all active keywords with metrics
    const keywords = await this.keywordRepository
      .createQueryBuilder('kw')
      .innerJoin(
        'campaigns',
        'c',
        'c.campaignId = kw.campaignId AND c.accountId = kw.accountId AND c.runId = kw.runId AND c.status = :cEnabled',
        { cEnabled: 'ENABLED' },
      )
      .innerJoin(
        'ad_groups',
        'ag',
        'ag.adGroupId = kw.adGroupId AND ag.accountId = kw.accountId AND ag.runId = kw.runId AND ag.status = :agEnabled',
        { agEnabled: 'ENABLED' },
      )
      .where('kw.accountId = :accountId', { accountId })
      .andWhere('kw.runId = :runId', { runId })
      .andWhere('kw.status = :kwStatus', { kwStatus: 'ENABLED' })
      .andWhere('kw.finalUrl IS NOT NULL')
      .andWhere("kw.finalUrl != ''")
      .getMany();

    if (keywords.length === 0) {
      return { clusters: [] };
    }

    // Prepare keyword data for AI
    const kwData = keywords.map((kw) => ({
      keywordText: kw.keywordText,
      keywordId: kw.keywordId,
      matchType: kw.matchType,
      impressions: Number(kw.impressions || 0),
      clicks: Number(kw.clicks || 0),
      cost: Number(kw.costMicros || 0) / 1_000_000,
      conversions: Number(kw.conversions || 0),
      qualityScore: kw.qualityScore || 0,
      landingPageExperience: kw.landingPageExperience || 'UNKNOWN',
      finalUrl: kw.finalUrl,
    }));

    const openai = await this.getOpenAIClient();
    let model = this.configService.get<string>('ai.openaiModel') || 'gpt-4o';
    const isGpt5 = model.startsWith('gpt-5');

    const systemPrompt = `Sei un esperto di Google Ads e SEO. Il tuo compito è analizzare un elenco di keyword attive e raggrupparle in cluster semantici.

Per ogni cluster devi:
1. Identificare un TOPIC comune (es. "Revisione Auto", "Tagliando Auto")
2. Scegliere la KEYWORD PRINCIPALE: quella più rappresentativa e con più volume/rilevanza per il cluster
3. Raggruppare le keyword che dovrebbero puntare alla stessa landing page

REGOLE:
- Ogni keyword deve appartenere a un solo cluster
- I cluster devono essere semanticamente coerenti
- La keyword principale deve essere quella con più impressioni O quella più generica/rappresentativa
- Se le keyword puntano già alla stessa URL, raggruppale insieme
- Non creare cluster con meno di 2 keyword (keyword singole vanno nel cluster più vicino)

Rispondi SOLO in JSON con questo formato:
{
  "clusters": [
    {
      "topic": "Nome descrittivo del cluster",
      "primaryKeyword": "keyword principale",
      "keywordIds": ["id1", "id2", ...]
    }
  ]
}`;

    const userPrompt = `Ecco le keyword attive dell'account con le relative metriche e URL attuali:

${JSON.stringify(kwData, null, 2)}

Analizza e crea i cluster semantici.`;

    this.logger.log(`Generating clusters for account ${accountId} with ${keywords.length} keywords`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(isGpt5 ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }),
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const parsed = JSON.parse(content);

    // Build keyword lookup
    const kwMap = new Map(kwData.map((kw) => [kw.keywordId, kw]));

    // Enrich clusters with full keyword data
    const clusters = (parsed.clusters || []).map((cluster: any) => {
      const clusterKeywords = (cluster.keywordIds || [])
        .map((id: string) => kwMap.get(id))
        .filter(Boolean);

      const avgQS =
        clusterKeywords.length > 0
          ? clusterKeywords.reduce((s: number, k: any) => s + k.qualityScore, 0) /
            clusterKeywords.length
          : 0;

      const totalCost = clusterKeywords.reduce((s: number, k: any) => s + k.cost, 0);
      const totalConversions = clusterKeywords.reduce(
        (s: number, k: any) => s + k.conversions,
        0,
      );

      // Most common URL in cluster
      const urlCounts = new Map<string, number>();
      for (const kw of clusterKeywords) {
        const url = (kw.finalUrl || '').replace(/\/+$/, '');
        urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
      }
      const currentUrl =
        [...urlCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';

      return {
        topic: cluster.topic,
        primaryKeyword: cluster.primaryKeyword,
        keywords: clusterKeywords,
        currentUrl,
        avgQualityScore: parseFloat(avgQS.toFixed(1)),
        totalCost: parseFloat(totalCost.toFixed(2)),
        totalConversions,
      };
    });

    this.logger.log(`Generated ${clusters.length} clusters for account ${accountId}`);
    return { clusters };
  }

  // =========================================================================
  // BRIEF GENERATION (AI)
  // =========================================================================

  async generateBrief(id: string): Promise<LandingPageBrief> {
    const brief = await this.getBrief(id);

    if (!brief.keywordCluster || brief.keywordCluster.length === 0) {
      throw new BadRequestException('No keyword cluster configured for this brief');
    }

    // Scrape if not done yet
    if (!brief.scrapedContent && brief.sourceUrl) {
      await this.scrapeSourceUrl(id);
      // Re-fetch after scrape
      const updated = await this.getBrief(id);
      brief.scrapedContent = updated.scrapedContent;
    }

    // Get account info for context
    const account = await this.accountRepository.findOne({
      where: { id: brief.accountId },
    });

    const openai = await this.getOpenAIClient();
    let model = this.configService.get<string>('ai.openaiModel') || 'gpt-4o';
    const isGpt5 = model.startsWith('gpt-5');

    const systemPrompt = `Sei un esperto di landing page, CRO (Conversion Rate Optimization) e SEO per Google Ads.

Il tuo compito è generare un BRIEF STRUTTURATO per una landing page ottimizzata per un cluster di keyword Google Ads.

Il brief deve essere pratico e dettagliato: l'utente lo userà per costruire la pagina in Elementor (WordPress).

Per ogni sezione suggerita, indica:
- Il tipo di sezione (hero, benefits, services, social_proof, faq, cta_final, text, gallery)
- Un titolo descrittivo
- Istruzioni chiare su cosa mettere
- Key points specifici (non generici)

Analizza anche la landing page attuale (se fornita) e indica i problemi specifici.

Rispondi SOLO in JSON con questo formato:
{
  "pagePurpose": "Scopo della pagina in una frase",
  "targetAudience": "Chi è il target",
  "metaTitle": "Meta title ottimizzato (max 60 caratteri)",
  "metaDescription": "Meta description ottimizzata (max 155 caratteri)",
  "sections": [
    {
      "type": "hero|benefits|services|social_proof|faq|cta_final|text|gallery",
      "title": "Nome sezione",
      "instructions": "Cosa deve contenere questa sezione",
      "keyPoints": ["punto 1", "punto 2", ...]
    }
  ],
  "seoNotes": ["consiglio SEO 1", "consiglio SEO 2", ...],
  "currentLpIssues": ["problema 1", "problema 2", ...]
}`;

    let scrapedContext = '';
    if (brief.scrapedContent) {
      const sc = brief.scrapedContent;
      scrapedContext = `

CONTENUTO LANDING PAGE ATTUALE (${brief.sourceUrl}):
- Title: ${sc.metaTitle || 'N/A'}
- Meta Description: ${sc.metaDescription || 'N/A'}
- Headings: ${(sc.headings || []).map((h) => `H${h.level}: ${h.text}`).join(', ')}
- Paragrafi principali: ${(sc.paragraphs || []).slice(0, 10).join(' | ')}
- Immagini: ${(sc.images || []).length} trovate
- Link interni: ${(sc.links || []).filter((l) => l.internal).length}
- Struttura: ${sc.structureSummary || 'N/A'}`;
    }

    const userPrompt = `ACCOUNT: ${account?.customerName || 'N/A'}

KEYWORD PRINCIPALE: ${brief.primaryKeyword}

CLUSTER DI KEYWORD:
${brief.keywordCluster
  .map(
    (kw) =>
      `- "${kw.keywordText}" (QS: ${kw.qualityScore || 'N/A'}, Impressioni: ${kw.impressions || 0}, Click: ${kw.clicks || 0}, Costo: €${(kw.cost || 0).toFixed(2)}, Conv: ${kw.conversions || 0})`,
  )
  .join('\n')}

URL LP ATTUALE: ${brief.sourceUrl || 'Nessuna'}
${scrapedContext}

Genera il brief strutturato per la landing page ottimizzata.`;

    this.logger.log(`Generating brief for "${brief.name}" (${brief.primaryKeyword})`);

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      ...(isGpt5 ? { max_completion_tokens: 4096 } : { max_tokens: 4096 }),
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    brief.brief = JSON.parse(content);
    brief.status = LandingPageBriefStatus.COMPLETED;
    return this.briefRepository.save(brief);
  }
}
