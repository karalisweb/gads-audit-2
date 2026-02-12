import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
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
  GeoPerformance,
  DevicePerformance,
  AuditIssue,
  User,
} from '../../entities';
import {
  PaginatedResponse,
  CampaignFilterDto,
  AdGroupFilterDto,
  AdFilterDto,
  KeywordFilterDto,
  SearchTermFilterDto,
  NegativeKeywordFilterDto,
  AssetFilterDto,
  CreateAccountDto,
} from './dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(GoogleAdsAccount)
    private readonly accountRepository: Repository<GoogleAdsAccount>,
    @InjectRepository(ImportRun)
    private readonly importRunRepository: Repository<ImportRun>,
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
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(ConversionAction)
    private readonly conversionActionRepository: Repository<ConversionAction>,
    @InjectRepository(GeoPerformance)
    private readonly geoPerformanceRepository: Repository<GeoPerformance>,
    @InjectRepository(DevicePerformance)
    private readonly devicePerformanceRepository: Repository<DevicePerformance>,
    @InjectRepository(AuditIssue)
    private readonly issueRepository: Repository<AuditIssue>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // =========================================================================
  // ACCOUNTS & IMPORT RUNS
  // =========================================================================

  async getAccounts(): Promise<GoogleAdsAccount[]> {
    return this.accountRepository.find({
      where: { isActive: true },
      order: { customerName: 'ASC' },
    });
  }

  async getAccountsWithStats(): Promise<any[]> {
    const accounts = await this.getAccounts();

    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const latestRun = await this.getLatestRun(account.id);

        if (!latestRun) {
          return {
            ...account,
            stats: null,
            lastImportDate: null,
          };
        }

        // Get KPIs for this account
        const kpis = await this.getKpis(account.id, latestRun.runId);

        // Get issue count - use latestRun.id (UUID) not latestRun.runId (string)
        const openIssueCount = await this.issueRepository.count({
          where: {
            accountId: account.id,
            runId: latestRun.id,
            status: 'open' as any,
            severity: 'critical' as any,
          },
        });

        const highIssueCount = await this.issueRepository.count({
          where: {
            accountId: account.id,
            runId: latestRun.id,
            status: 'open' as any,
            severity: 'high' as any,
          },
        });

        return {
          ...account,
          stats: {
            cost: kpis?.performance?.cost || 0,
            cpa: kpis?.performance?.cpa || 0,
            conversions: kpis?.performance?.conversions || 0,
            impressions: kpis?.performance?.impressions || 0,
            clicks: kpis?.performance?.clicks || 0,
            ctr: kpis?.performance?.ctr || 0,
            roas: kpis?.performance?.roas || 0,
            urgentIssues: openIssueCount + highIssueCount,
            totalCampaigns: kpis?.overview?.totalCampaigns || 0,
            activeCampaigns: kpis?.overview?.activeCampaigns || 0,
          },
          lastImportDate: latestRun.completedAt,
        };
      }),
    );

    return accountsWithStats;
  }

  async createAccount(dto: CreateAccountDto): Promise<GoogleAdsAccount> {
    // Normalize customerId: remove dashes (Google Ads script sends ID without dashes)
    const normalizedCustomerId = dto.customerId.replace(/-/g, '');

    // Check if account already exists
    const existing = await this.accountRepository.findOne({
      where: { customerId: normalizedCustomerId },
    });
    if (existing) {
      throw new ConflictException('Account with this Customer ID already exists');
    }

    // Generate a random shared secret for HMAC authentication
    const sharedSecret = crypto.randomBytes(32).toString('hex');

    const account = this.accountRepository.create({
      customerId: normalizedCustomerId,
      customerName: dto.customerName,
      currencyCode: dto.currencyCode || 'EUR',
      timeZone: dto.timeZone || 'Europe/Rome',
      sharedSecret,
      isActive: true,
    });

    return this.accountRepository.save(account);
  }

  async revealSharedSecret(
    accountId: string,
    userId: string,
    password: string,
  ): Promise<{ sharedSecret: string }> {
    // Get the user
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password non corretta');
    }

    // Get the account
    const account = await this.accountRepository.findOne({
      where: { id: accountId, isActive: true },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return { sharedSecret: account.sharedSecret };
  }

  async deleteAccount(accountId: string): Promise<{ success: boolean; message: string }> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Soft delete - set isActive to false
    account.isActive = false;
    await this.accountRepository.save(account);

    return { success: true, message: `Account "${account.customerName}" eliminato con successo` };
  }

  async getAccount(accountId: string): Promise<GoogleAdsAccount> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, isActive: true },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  async getImportRuns(accountId: string): Promise<ImportRun[]> {
    return this.importRunRepository.find({
      where: { accountId },
      order: { startedAt: 'DESC' },
      take: 20,
    });
  }

  async getLatestRun(accountId: string): Promise<ImportRun | null> {
    return this.importRunRepository.findOne({
      where: { accountId, status: 'completed' as any },
      order: { completedAt: 'DESC' },
    });
  }

  // =========================================================================
  // CAMPAIGNS
  // =========================================================================

  async getCampaigns(
    accountId: string,
    filters: CampaignFilterDto,
  ): Promise<PaginatedResponse<Campaign>> {
    const { page = 1, limit = 50, sortBy = 'costMicros', sortOrder = 'DESC' } = filters;

    const runId = filters.runId || (await this.getLatestRunId(accountId));
    if (!runId) {
      return new PaginatedResponse([], 0, page, limit);
    }

    const qb = this.campaignRepository.createQueryBuilder('c');
    qb.where('c.accountId = :accountId', { accountId });
    qb.andWhere('c.runId = :runId', { runId });

    // Apply filters
    if (filters.search) {
      qb.andWhere('c.campaignName ILIKE :search', { search: `%${filters.search}%` });
    }
    if (filters.status?.length) {
      qb.andWhere('c.status IN (:...status)', { status: filters.status });
    }
    if (filters.advertisingChannelType?.length) {
      qb.andWhere('c.advertisingChannelType IN (:...types)', {
        types: filters.advertisingChannelType,
      });
    }
    if (filters.biddingStrategyType?.length) {
      qb.andWhere('c.biddingStrategyType IN (:...strategies)', {
        strategies: filters.biddingStrategyType,
      });
    }
    if (filters.minImpressions !== undefined) {
      qb.andWhere('CAST(c.impressions AS BIGINT) >= :minImpressions', {
        minImpressions: filters.minImpressions,
      });
    }
    if (filters.minClicks !== undefined) {
      qb.andWhere('CAST(c.clicks AS BIGINT) >= :minClicks', {
        minClicks: filters.minClicks,
      });
    }
    if (filters.minConversions !== undefined) {
      qb.andWhere('CAST(c.conversions AS DECIMAL) >= :minConversions', {
        minConversions: filters.minConversions,
      });
    }
    if (filters.minCost !== undefined) {
      qb.andWhere('CAST(c.costMicros AS BIGINT) >= :minCost', {
        minCost: filters.minCost * 1000000, // Convert to micros
      });
    }

    // Sorting
    const validSortFields = [
      'campaignName',
      'status',
      'impressions',
      'clicks',
      'costMicros',
      'conversions',
      'ctr',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'costMicros';
    qb.orderBy(`c.${sortField}`, sortOrder);

    // Pagination
    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();
    return new PaginatedResponse(data, total, page, limit);
  }

  // =========================================================================
  // AD GROUPS
  // =========================================================================

  async getAdGroups(
    accountId: string,
    filters: AdGroupFilterDto,
  ): Promise<PaginatedResponse<AdGroup>> {
    const { page = 1, limit = 50, sortBy = 'costMicros', sortOrder = 'DESC' } = filters;

    const runId = filters.runId || (await this.getLatestRunId(accountId));
    if (!runId) {
      return new PaginatedResponse([], 0, page, limit);
    }

    const qb = this.adGroupRepository.createQueryBuilder('ag');
    qb.where('ag.accountId = :accountId', { accountId });
    qb.andWhere('ag.runId = :runId', { runId });

    // Filtra solo ad group in campagne ENABLED
    qb.innerJoin('campaigns', 'c', 'c.campaignId = ag.campaignId AND c.accountId = ag.accountId AND c.runId = ag.runId AND c.status = :cEnabled', { cEnabled: 'ENABLED' });

    if (filters.search) {
      qb.andWhere('(ag.adGroupName ILIKE :search OR ag.campaignName ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }
    if (filters.campaignId) {
      qb.andWhere('ag.campaignId = :campaignId', { campaignId: filters.campaignId });
    }
    if (filters.status?.length) {
      qb.andWhere('ag.status IN (:...status)', { status: filters.status });
    }
    if (filters.minImpressions !== undefined) {
      qb.andWhere('CAST(ag.impressions AS BIGINT) >= :minImpressions', {
        minImpressions: filters.minImpressions,
      });
    }
    if (filters.minConversions !== undefined) {
      qb.andWhere('CAST(ag.conversions AS DECIMAL) >= :minConversions', {
        minConversions: filters.minConversions,
      });
    }

    const validSortFields = [
      'adGroupName',
      'campaignName',
      'status',
      'impressions',
      'clicks',
      'costMicros',
      'conversions',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'costMicros';
    qb.orderBy(`ag.${sortField}`, sortOrder);

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();
    return new PaginatedResponse(data, total, page, limit);
  }

  // =========================================================================
  // ADS
  // =========================================================================

  async getAds(accountId: string, filters: AdFilterDto): Promise<PaginatedResponse<Ad>> {
    const { page = 1, limit = 50, sortBy = 'costMicros', sortOrder = 'DESC' } = filters;

    const runId = filters.runId || (await this.getLatestRunId(accountId));
    if (!runId) {
      return new PaginatedResponse([], 0, page, limit);
    }

    const qb = this.adRepository.createQueryBuilder('ad');
    qb.where('ad.accountId = :accountId', { accountId });
    qb.andWhere('ad.runId = :runId', { runId });

    // Filtra solo annunci in campagne ENABLED e ad group ENABLED
    qb.innerJoin('campaigns', 'c', 'c.campaignId = ad.campaignId AND c.accountId = ad.accountId AND c.runId = ad.runId AND c.status = :cEnabled', { cEnabled: 'ENABLED' });
    qb.innerJoin('ad_groups', 'ag', 'ag.adGroupId = ad.adGroupId AND ag.accountId = ad.accountId AND ag.runId = ad.runId AND ag.status = :agEnabled', { agEnabled: 'ENABLED' });

    if (filters.search) {
      qb.andWhere(
        '(ad.adGroupName ILIKE :search OR ad.campaignName ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters.campaignId) {
      qb.andWhere('ad.campaignId = :campaignId', { campaignId: filters.campaignId });
    }
    if (filters.adGroupId) {
      qb.andWhere('ad.adGroupId = :adGroupId', { adGroupId: filters.adGroupId });
    }
    if (filters.status?.length) {
      qb.andWhere('ad.status IN (:...status)', { status: filters.status });
    }
    if (filters.adType?.length) {
      qb.andWhere('ad.adType IN (:...adType)', { adType: filters.adType });
    }
    if (filters.adStrength?.length) {
      qb.andWhere('ad.adStrength IN (:...adStrength)', { adStrength: filters.adStrength });
    }
    if (filters.minImpressions !== undefined) {
      qb.andWhere('CAST(ad.impressions AS BIGINT) >= :minImpressions', {
        minImpressions: filters.minImpressions,
      });
    }

    const validSortFields = [
      'adGroupName',
      'campaignName',
      'status',
      'adStrength',
      'impressions',
      'clicks',
      'costMicros',
      'conversions',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'costMicros';
    qb.orderBy(`ad.${sortField}`, sortOrder);

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();
    return new PaginatedResponse(data, total, page, limit);
  }

  // =========================================================================
  // KEYWORDS
  // =========================================================================

  async getKeywords(
    accountId: string,
    filters: KeywordFilterDto,
  ): Promise<PaginatedResponse<Keyword>> {
    const { page = 1, limit = 50, sortBy = 'costMicros', sortOrder = 'DESC' } = filters;

    const runId = filters.runId || (await this.getLatestRunId(accountId));
    if (!runId) {
      return new PaginatedResponse([], 0, page, limit);
    }

    const qb = this.keywordRepository.createQueryBuilder('kw');
    qb.where('kw.accountId = :accountId', { accountId });
    qb.andWhere('kw.runId = :runId', { runId });

    // Exclude keywords that exist in negative_keywords table at any level:
    // - AD_GROUP level: exact ad_group_id match
    // - CAMPAIGN level: same campaign_id, no ad_group_id (applies to all ad groups in campaign)
    // - ACCOUNT level: no campaign_id (applies to entire account)
    qb.andWhere(`NOT EXISTS (
      SELECT 1 FROM negative_keywords nk
      WHERE LOWER(nk.keyword_text) = LOWER(kw.keyword_text)
      AND nk.account_id = kw.account_id
      AND (
        nk.ad_group_id = kw.ad_group_id
        OR (nk.campaign_id = kw.campaign_id AND (nk.ad_group_id IS NULL OR nk.ad_group_id = ''))
        OR (nk.campaign_id IS NULL OR nk.campaign_id = '')
      )
    )`);

    // Filtra solo keyword in campagne ENABLED e ad group ENABLED
    qb.innerJoin('campaigns', 'c', 'c.campaignId = kw.campaignId AND c.accountId = kw.accountId AND c.runId = kw.runId AND c.status = :cEnabled', { cEnabled: 'ENABLED' });
    qb.innerJoin('ad_groups', 'ag', 'ag.adGroupId = kw.adGroupId AND ag.accountId = kw.accountId AND ag.runId = kw.runId AND ag.status = :agEnabled', { agEnabled: 'ENABLED' });

    if (filters.search) {
      qb.andWhere('kw.keywordText ILIKE :search', { search: `%${filters.search}%` });
    }
    if (filters.campaignId) {
      qb.andWhere('kw.campaignId = :campaignId', { campaignId: filters.campaignId });
    }
    if (filters.adGroupId) {
      qb.andWhere('kw.adGroupId = :adGroupId', { adGroupId: filters.adGroupId });
    }
    if (filters.status?.length) {
      qb.andWhere('kw.status IN (:...status)', { status: filters.status });
    }
    if (filters.matchType?.length) {
      qb.andWhere('kw.matchType IN (:...matchType)', { matchType: filters.matchType });
    }
    if (filters.minQualityScore !== undefined) {
      qb.andWhere('kw.qualityScore >= :minQualityScore', {
        minQualityScore: filters.minQualityScore,
      });
    }
    if (filters.maxQualityScore !== undefined) {
      qb.andWhere('kw.qualityScore <= :maxQualityScore', {
        maxQualityScore: filters.maxQualityScore,
      });
    }
    if (filters.minImpressions !== undefined) {
      qb.andWhere('CAST(kw.impressions AS BIGINT) >= :minImpressions', {
        minImpressions: filters.minImpressions,
      });
    }
    if (filters.minConversions !== undefined) {
      qb.andWhere('CAST(kw.conversions AS DECIMAL) >= :minConversions', {
        minConversions: filters.minConversions,
      });
    }

    const validSortFields = [
      'keywordText',
      'matchType',
      'status',
      'qualityScore',
      'impressions',
      'clicks',
      'costMicros',
      'conversions',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'costMicros';
    qb.orderBy(`kw.${sortField}`, sortOrder);

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();
    return new PaginatedResponse(data, total, page, limit);
  }

  // =========================================================================
  // SEARCH TERMS
  // =========================================================================

  async getSearchTerms(
    accountId: string,
    filters: SearchTermFilterDto,
  ): Promise<PaginatedResponse<SearchTerm>> {
    const { page = 1, limit = 50, sortBy = 'costMicros', sortOrder = 'DESC' } = filters;

    const runId = filters.runId || (await this.getLatestRunId(accountId));
    if (!runId) {
      return new PaginatedResponse([], 0, page, limit);
    }

    const qb = this.searchTermRepository.createQueryBuilder('st');
    qb.where('st.accountId = :accountId', { accountId });
    qb.andWhere('st.runId = :runId', { runId });

    // Filtra solo search terms di campagne ENABLED e ad group ENABLED
    qb.innerJoin('campaigns', 'c', 'c.campaignId = st.campaignId AND c.accountId = st.accountId AND c.runId = st.runId AND c.status = :cEnabled', { cEnabled: 'ENABLED' });
    qb.innerJoin('ad_groups', 'ag', 'ag.adGroupId = st.adGroupId AND ag.accountId = st.accountId AND ag.runId = st.runId AND ag.status = :agEnabled', { agEnabled: 'ENABLED' });

    if (filters.search) {
      qb.andWhere('st.searchTerm ILIKE :search', { search: `%${filters.search}%` });
    }
    if (filters.campaignId) {
      qb.andWhere('st.campaignId = :campaignId', { campaignId: filters.campaignId });
    }
    if (filters.adGroupId) {
      qb.andWhere('st.adGroupId = :adGroupId', { adGroupId: filters.adGroupId });
    }
    if (filters.keywordId) {
      qb.andWhere('st.keywordId = :keywordId', { keywordId: filters.keywordId });
    }
    if (filters.minImpressions !== undefined) {
      qb.andWhere('CAST(st.impressions AS BIGINT) >= :minImpressions', {
        minImpressions: filters.minImpressions,
      });
    }
    if (filters.minConversions !== undefined) {
      qb.andWhere('CAST(st.conversions AS DECIMAL) >= :minConversions', {
        minConversions: filters.minConversions,
      });
    }
    if (filters.minCost !== undefined) {
      qb.andWhere('CAST(st.costMicros AS BIGINT) >= :minCost', {
        minCost: filters.minCost * 1000000,
      });
    }

    const validSortFields = [
      'searchTerm',
      'keywordText',
      'impressions',
      'clicks',
      'costMicros',
      'conversions',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'costMicros';
    qb.orderBy(`st.${sortField}`, sortOrder);

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();
    return new PaginatedResponse(data, total, page, limit);
  }

  // =========================================================================
  // NEGATIVE KEYWORDS
  // =========================================================================

  async getNegativeKeywords(
    accountId: string,
    filters: NegativeKeywordFilterDto,
  ): Promise<PaginatedResponse<NegativeKeyword>> {
    const { page = 1, limit = 50, sortBy = 'keywordText', sortOrder = 'ASC' } = filters;

    const runId = filters.runId || (await this.getLatestRunId(accountId));
    if (!runId) {
      return new PaginatedResponse([], 0, page, limit);
    }

    const qb = this.negativeKeywordRepository.createQueryBuilder('nk');
    qb.where('nk.accountId = :accountId', { accountId });
    qb.andWhere('nk.runId = :runId', { runId });

    if (filters.search) {
      qb.andWhere('nk.keywordText ILIKE :search', { search: `%${filters.search}%` });
    }
    if (filters.campaignId) {
      qb.andWhere('nk.campaignId = :campaignId', { campaignId: filters.campaignId });
    }
    if (filters.adGroupId) {
      qb.andWhere('nk.adGroupId = :adGroupId', { adGroupId: filters.adGroupId });
    }
    if (filters.level?.length) {
      qb.andWhere('nk.level IN (:...level)', { level: filters.level });
    }
    if (filters.matchType?.length) {
      qb.andWhere('nk.matchType IN (:...matchType)', { matchType: filters.matchType });
    }

    const validSortFields = ['keywordText', 'matchType', 'level', 'campaignName', 'adGroupName'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'keywordText';
    qb.orderBy(`nk.${sortField}`, sortOrder);

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();
    return new PaginatedResponse(data, total, page, limit);
  }

  // =========================================================================
  // ASSETS
  // =========================================================================

  async getAssets(
    accountId: string,
    filters: AssetFilterDto,
  ): Promise<PaginatedResponse<Asset>> {
    const { page = 1, limit = 50, sortBy = 'impressions', sortOrder = 'DESC' } = filters;

    const runId = filters.runId || (await this.getLatestRunId(accountId));
    if (!runId) {
      return new PaginatedResponse([], 0, page, limit);
    }

    const qb = this.assetRepository.createQueryBuilder('a');
    qb.where('a.accountId = :accountId', { accountId });
    qb.andWhere('a.runId = :runId', { runId });

    if (filters.search) {
      qb.andWhere('a.assetText ILIKE :search', { search: `%${filters.search}%` });
    }
    if (filters.campaignId) {
      qb.andWhere('a.campaignId = :campaignId', { campaignId: filters.campaignId });
    }
    if (filters.assetType?.length) {
      qb.andWhere('a.assetType IN (:...assetType)', { assetType: filters.assetType });
    }
    if (filters.performanceLabel?.length) {
      qb.andWhere('a.performanceLabel IN (:...performanceLabel)', {
        performanceLabel: filters.performanceLabel,
      });
    }
    if (filters.status?.length) {
      qb.andWhere('a.status IN (:...status)', { status: filters.status });
    }

    const validSortFields = [
      'assetText',
      'assetType',
      'performanceLabel',
      'status',
      'impressions',
      'clicks',
      'conversions',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'impressions';
    qb.orderBy(`a.${sortField}`, sortOrder);

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();
    return new PaginatedResponse(data, total, page, limit);
  }

  // =========================================================================
  // KPI & AGGREGATIONS
  // =========================================================================

  async getKpis(accountId: string, runId?: string): Promise<any> {
    const targetRunId = runId || (await this.getLatestRunId(accountId));
    if (!targetRunId) {
      return null;
    }

    // Get campaign aggregates - conteggi su tutte, performance SOLO da campagne ENABLED
    const campaignStats = await this.campaignRepository
      .createQueryBuilder('c')
      .select([
        'COUNT(*)::int as "totalCampaigns"',
        'SUM(CASE WHEN c.status = \'ENABLED\' THEN 1 ELSE 0 END)::int as "activeCampaigns"',
        'SUM(CASE WHEN c.status = \'ENABLED\' THEN CAST(c.impressions AS BIGINT) ELSE 0 END) as "totalImpressions"',
        'SUM(CASE WHEN c.status = \'ENABLED\' THEN CAST(c.clicks AS BIGINT) ELSE 0 END) as "totalClicks"',
        'SUM(CASE WHEN c.status = \'ENABLED\' THEN CAST(c.costMicros AS BIGINT) ELSE 0 END) as "totalCostMicros"',
        'SUM(CASE WHEN c.status = \'ENABLED\' THEN CAST(c.conversions AS DECIMAL) ELSE 0 END) as "totalConversions"',
        'SUM(CASE WHEN c.status = \'ENABLED\' THEN CAST(c.conversionsValue AS DECIMAL) ELSE 0 END) as "totalConversionsValue"',
      ])
      .where('c.accountId = :accountId', { accountId })
      .andWhere('c.runId = :runId', { runId: targetRunId })
      .getRawOne();

    // Get ad group count - solo quelli in campagne attive
    const adGroupStats = await this.adGroupRepository
      .createQueryBuilder('ag')
      .innerJoin('campaigns', 'c', 'c.campaignId = ag.campaignId AND c.accountId = ag.accountId AND c.runId = ag.runId AND c.status = :cEnabled', { cEnabled: 'ENABLED' })
      .select([
        'COUNT(*)::int as "totalAdGroups"',
        'SUM(CASE WHEN ag.status = \'ENABLED\' THEN 1 ELSE 0 END)::int as "activeAdGroups"',
      ])
      .where('ag.accountId = :accountId', { accountId })
      .andWhere('ag.runId = :runId', { runId: targetRunId })
      .getRawOne();

    // Get keyword stats - solo in campagne e ad group attivi
    const keywordStats = await this.keywordRepository
      .createQueryBuilder('kw')
      .innerJoin('campaigns', 'c', 'c.campaignId = kw.campaignId AND c.accountId = kw.accountId AND c.runId = kw.runId AND c.status = :cEnabled', { cEnabled: 'ENABLED' })
      .innerJoin('ad_groups', 'ag', 'ag.adGroupId = kw.adGroupId AND ag.accountId = kw.accountId AND ag.runId = kw.runId AND ag.status = :agEnabled', { agEnabled: 'ENABLED' })
      .select([
        'COUNT(*)::int as "totalKeywords"',
        'SUM(CASE WHEN kw.status = \'ENABLED\' THEN 1 ELSE 0 END)::int as "activeKeywords"',
        'AVG(kw.qualityScore) as "avgQualityScore"',
        'SUM(CASE WHEN kw.qualityScore < 5 THEN 1 ELSE 0 END)::int as "lowQualityKeywords"',
      ])
      .where('kw.accountId = :accountId', { accountId })
      .andWhere('kw.runId = :runId', { runId: targetRunId })
      .getRawOne();

    // Get ad stats - solo in campagne e ad group attivi
    const adStats = await this.adRepository
      .createQueryBuilder('ad')
      .innerJoin('campaigns', 'c', 'c.campaignId = ad.campaignId AND c.accountId = ad.accountId AND c.runId = ad.runId AND c.status = :cEnabled', { cEnabled: 'ENABLED' })
      .innerJoin('ad_groups', 'ag', 'ag.adGroupId = ad.adGroupId AND ag.accountId = ad.accountId AND ag.runId = ad.runId AND ag.status = :agEnabled', { agEnabled: 'ENABLED' })
      .select([
        'COUNT(*)::int as "totalAds"',
        'SUM(CASE WHEN ad.adStrength = \'EXCELLENT\' THEN 1 ELSE 0 END)::int as "excellentAds"',
        'SUM(CASE WHEN ad.adStrength = \'GOOD\' THEN 1 ELSE 0 END)::int as "goodAds"',
        'SUM(CASE WHEN ad.adStrength IN (\'AVERAGE\', \'POOR\') THEN 1 ELSE 0 END)::int as "weakAds"',
      ])
      .where('ad.accountId = :accountId', { accountId })
      .andWhere('ad.runId = :runId', { runId: targetRunId })
      .getRawOne();

    // Get search terms count - solo in campagne e ad group attivi
    const searchTermCount = await this.searchTermRepository
      .createQueryBuilder('st')
      .innerJoin('campaigns', 'c', 'c.campaignId = st.campaignId AND c.accountId = st.accountId AND c.runId = st.runId AND c.status = :cEnabled', { cEnabled: 'ENABLED' })
      .innerJoin('ad_groups', 'ag', 'ag.adGroupId = st.adGroupId AND ag.accountId = st.accountId AND ag.runId = st.runId AND ag.status = :agEnabled', { agEnabled: 'ENABLED' })
      .where('st.accountId = :accountId', { accountId })
      .andWhere('st.runId = :runId', { runId: targetRunId })
      .getCount();

    // Get negative keywords count - solo in campagne attive
    const negativeCount = await this.negativeKeywordRepository
      .createQueryBuilder('nk')
      .innerJoin('campaigns', 'c', 'c.campaignId = nk.campaignId AND c.accountId = nk.accountId AND c.runId = nk.runId AND c.status = :cEnabled', { cEnabled: 'ENABLED' })
      .where('nk.accountId = :accountId', { accountId })
      .andWhere('nk.runId = :runId', { runId: targetRunId })
      .getCount();

    // Calculate derived metrics
    const totalCostMicros = parseInt(campaignStats.totalCostMicros) || 0;
    const totalConversions = parseFloat(campaignStats.totalConversions) || 0;
    const totalConversionsValue = parseFloat(campaignStats.totalConversionsValue) || 0;
    const totalClicks = parseInt(campaignStats.totalClicks) || 0;
    const totalImpressions = parseInt(campaignStats.totalImpressions) || 0;

    return {
      runId: targetRunId,
      overview: {
        totalCampaigns: campaignStats.totalCampaigns,
        activeCampaigns: campaignStats.activeCampaigns,
        totalAdGroups: adGroupStats.totalAdGroups,
        activeAdGroups: adGroupStats.activeAdGroups,
        totalKeywords: keywordStats.totalKeywords,
        activeKeywords: keywordStats.activeKeywords,
        totalAds: adStats.totalAds,
        totalSearchTerms: searchTermCount,
        totalNegativeKeywords: negativeCount,
      },
      performance: {
        impressions: totalImpressions,
        clicks: totalClicks,
        cost: totalCostMicros / 1000000, // Convert from micros
        conversions: totalConversions,
        conversionsValue: totalConversionsValue,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        avgCpc: totalClicks > 0 ? totalCostMicros / totalClicks / 1000000 : 0,
        cpa: totalConversions > 0 ? totalCostMicros / totalConversions / 1000000 : 0,
        roas: totalCostMicros > 0 ? (totalConversionsValue * 1000000) / totalCostMicros : 0,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      },
      quality: {
        avgQualityScore: parseFloat(keywordStats.avgQualityScore) || 0,
        lowQualityKeywords: keywordStats.lowQualityKeywords,
        excellentAds: adStats.excellentAds,
        goodAds: adStats.goodAds,
        weakAds: adStats.weakAds,
      },
    };
  }

  async getConversionActions(
    accountId: string,
    filters: {
      runId?: string;
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    } = {},
  ): Promise<PaginatedResponse<ConversionAction>> {
    const targetRunId = filters.runId || (await this.getLatestRunId(accountId));
    if (!targetRunId) {
      return {
        data: [],
        meta: { total: 0, page: 1, limit: filters.limit || 100, totalPages: 0 },
      };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'ASC';

    const qb = this.conversionActionRepository
      .createQueryBuilder('ca')
      .where('ca.accountId = :accountId', { accountId })
      .andWhere('ca.runId = :runId', { runId: targetRunId });

    // Search filter
    if (filters.search) {
      qb.andWhere('LOWER(ca.name) LIKE :search', {
        search: `%${filters.search.toLowerCase()}%`,
      });
    }

    // Status filter
    if (filters.status) {
      qb.andWhere('ca.status = :status', { status: filters.status });
    }

    // Count total
    const total = await qb.getCount();

    // Apply sorting and pagination
    const validSortFields = ['name', 'status', 'type', 'category', 'origin', 'countingType', 'primaryForGoal', 'campaignsUsingCount'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';

    qb.orderBy(`ca.${sortField}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const data = await qb.getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGeoPerformance(accountId: string, runId?: string): Promise<GeoPerformance[]> {
    const targetRunId = runId || (await this.getLatestRunId(accountId));
    if (!targetRunId) {
      return [];
    }

    return this.geoPerformanceRepository.find({
      where: { accountId, runId: targetRunId },
      order: { impressions: 'DESC' },
      take: 100,
    });
  }

  async getDevicePerformance(accountId: string, runId?: string): Promise<DevicePerformance[]> {
    const targetRunId = runId || (await this.getLatestRunId(accountId));
    if (!targetRunId) {
      return [];
    }

    return this.devicePerformanceRepository.find({
      where: { accountId, runId: targetRunId },
      order: { impressions: 'DESC' },
    });
  }

  // =========================================================================
  // AUDIT ISSUES
  // =========================================================================

  async getIssues(
    accountId: string,
    filters: {
      runId?: string;
      severity?: string[];
      category?: string[];
      status?: string[];
      entityType?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<PaginatedResponse<AuditIssue>> {
    const { page = 1, limit = 50, sortBy = 'severity', sortOrder = 'DESC' } = filters;

    const runId = filters.runId || (await this.getLatestRunId(accountId));
    if (!runId) {
      return new PaginatedResponse([], 0, page, limit);
    }

    const qb = this.issueRepository.createQueryBuilder('i');
    qb.where('i.accountId = :accountId', { accountId });
    qb.andWhere('i.runId = :runId', { runId });

    if (filters.severity?.length) {
      qb.andWhere('i.severity IN (:...severity)', { severity: filters.severity });
    }
    if (filters.category?.length) {
      qb.andWhere('i.category IN (:...category)', { category: filters.category });
    }
    if (filters.status?.length) {
      qb.andWhere('i.status IN (:...status)', { status: filters.status });
    }
    if (filters.entityType) {
      qb.andWhere('i.entityType = :entityType', { entityType: filters.entityType });
    }

    // Custom sort for severity
    if (sortBy === 'severity') {
      qb.orderBy(
        `CASE i.severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          WHEN 'info' THEN 5
          ELSE 6 END`,
        sortOrder,
      );
    } else {
      const validSortFields = ['title', 'category', 'status', 'createdAt', 'potentialSavings'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      qb.orderBy(`i.${sortField}`, sortOrder);
    }

    const total = await qb.getCount();
    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();
    return new PaginatedResponse(data, total, page, limit);
  }

  async updateIssueStatus(
    accountId: string,
    issueId: string,
    status: 'acknowledged' | 'resolved' | 'ignored',
  ): Promise<AuditIssue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId, accountId },
    });

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    issue.status = status;
    if (status === 'acknowledged') {
      issue.acknowledgedAt = new Date();
    } else if (status === 'resolved') {
      issue.resolvedAt = new Date();
    }

    return this.issueRepository.save(issue);
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  private async getLatestRunId(accountId: string): Promise<string | null> {
    const latestRun = await this.getLatestRun(accountId);
    return latestRun?.runId || null;
  }

  // =========================================================================
  // DEBUG/DIAGNOSTICS
  // =========================================================================

  async getDataStatus(accountId: string): Promise<{
    accountId: string;
    latestCompletedRun: { runId: string; completedAt: Date } | null;
    allRuns: Array<{ runId: string; status: string; completedAt: Date | null; datasetsReceived: number; datasetsExpected: number }>;
    dataCounts: {
      campaigns: number;
      adGroups: number;
      ads: number;
      keywords: number;
      searchTerms: number;
      negativeKeywords: number;
    };
    searchTermsPerRun: Array<{ runId: string; count: number }>;
  }> {
    // Get latest completed run
    const latestRun = await this.getLatestRun(accountId);

    // Get all runs for this account
    const allRuns = await this.importRunRepository.find({
      where: { accountId },
      order: { startedAt: 'DESC' },
      take: 10,
    });

    // Get counts for the latest run
    const runId = latestRun?.runId;
    let dataCounts = {
      campaigns: 0,
      adGroups: 0,
      ads: 0,
      keywords: 0,
      searchTerms: 0,
      negativeKeywords: 0,
    };

    if (runId) {
      const [campaigns, adGroups, ads, keywords, searchTerms, negativeKeywords] = await Promise.all([
        this.campaignRepository.count({ where: { accountId, runId } }),
        this.adGroupRepository.count({ where: { accountId, runId } }),
        this.adRepository.count({ where: { accountId, runId } }),
        this.keywordRepository.count({ where: { accountId, runId } }),
        this.searchTermRepository.count({ where: { accountId, runId } }),
        this.negativeKeywordRepository.count({ where: { accountId, runId } }),
      ]);
      dataCounts = { campaigns, adGroups, ads, keywords, searchTerms, negativeKeywords };
    }

    // Get search terms count per run
    const searchTermsPerRun = await this.searchTermRepository
      .createQueryBuilder('st')
      .select('st.runId', 'runId')
      .addSelect('COUNT(*)', 'count')
      .where('st.accountId = :accountId', { accountId })
      .groupBy('st.runId')
      .getRawMany();

    return {
      accountId,
      latestCompletedRun: latestRun ? { runId: latestRun.runId, completedAt: latestRun.completedAt } : null,
      allRuns: allRuns.map(r => ({
        runId: r.runId,
        status: r.status,
        completedAt: r.completedAt,
        datasetsReceived: r.datasetsReceived,
        datasetsExpected: r.datasetsExpected,
      })),
      dataCounts,
      searchTermsPerRun,
    };
  }
}
