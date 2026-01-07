import { Controller, Get, Post, Patch, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditRulesService } from './audit-rules.service';
import { CurrentUser } from '../../common/decorators';
import {
  CampaignFilterDto,
  AdGroupFilterDto,
  AdFilterDto,
  KeywordFilterDto,
  SearchTermFilterDto,
  NegativeKeywordFilterDto,
  AssetFilterDto,
  IssueFilterDto,
  CreateAccountDto,
  RevealSecretDto,
} from './dto';

@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly auditRulesService: AuditRulesService,
  ) {}

  // =========================================================================
  // ACCOUNTS & RUNS
  // =========================================================================

  @Get('accounts')
  async getAccounts() {
    return this.auditService.getAccounts();
  }

  @Get('accounts-with-stats')
  async getAccountsWithStats() {
    return this.auditService.getAccountsWithStats();
  }

  @Post('accounts')
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.auditService.createAccount(dto);
  }

  @Get('accounts/:accountId')
  async getAccount(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.auditService.getAccount(accountId);
  }

  @Post('accounts/:accountId/reveal-secret')
  async revealSharedSecret(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: RevealSecretDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.auditService.revealSharedSecret(accountId, userId, dto.password);
  }

  @Get('accounts/:accountId/runs')
  async getImportRuns(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.auditService.getImportRuns(accountId);
  }

  @Get('accounts/:accountId/runs/latest')
  async getLatestRun(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.auditService.getLatestRun(accountId);
  }

  // =========================================================================
  // KPIs
  // =========================================================================

  @Get('accounts/:accountId/kpis')
  async getKpis(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('runId') runId?: string,
  ) {
    return this.auditService.getKpis(accountId, runId);
  }

  // =========================================================================
  // CAMPAIGNS
  // =========================================================================

  @Get('accounts/:accountId/campaigns')
  async getCampaigns(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: CampaignFilterDto,
  ) {
    return this.auditService.getCampaigns(accountId, filters);
  }

  // =========================================================================
  // AD GROUPS
  // =========================================================================

  @Get('accounts/:accountId/ad-groups')
  async getAdGroups(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: AdGroupFilterDto,
  ) {
    return this.auditService.getAdGroups(accountId, filters);
  }

  // =========================================================================
  // ADS
  // =========================================================================

  @Get('accounts/:accountId/ads')
  async getAds(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: AdFilterDto,
  ) {
    return this.auditService.getAds(accountId, filters);
  }

  // =========================================================================
  // KEYWORDS
  // =========================================================================

  @Get('accounts/:accountId/keywords')
  async getKeywords(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: KeywordFilterDto,
  ) {
    return this.auditService.getKeywords(accountId, filters);
  }

  // =========================================================================
  // SEARCH TERMS
  // =========================================================================

  @Get('accounts/:accountId/search-terms')
  async getSearchTerms(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: SearchTermFilterDto,
  ) {
    return this.auditService.getSearchTerms(accountId, filters);
  }

  // =========================================================================
  // NEGATIVE KEYWORDS
  // =========================================================================

  @Get('accounts/:accountId/negative-keywords')
  async getNegativeKeywords(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: NegativeKeywordFilterDto,
  ) {
    return this.auditService.getNegativeKeywords(accountId, filters);
  }

  // =========================================================================
  // ASSETS
  // =========================================================================

  @Get('accounts/:accountId/assets')
  async getAssets(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: AssetFilterDto,
  ) {
    return this.auditService.getAssets(accountId, filters);
  }

  // =========================================================================
  // CONVERSION ACTIONS
  // =========================================================================

  @Get('accounts/:accountId/conversion-actions')
  async getConversionActions(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('runId') runId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.auditService.getConversionActions(accountId, {
      runId,
      search,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  // =========================================================================
  // GEO & DEVICE PERFORMANCE
  // =========================================================================

  @Get('accounts/:accountId/geo-performance')
  async getGeoPerformance(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('runId') runId?: string,
  ) {
    return this.auditService.getGeoPerformance(accountId, runId);
  }

  @Get('accounts/:accountId/device-performance')
  async getDevicePerformance(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('runId') runId?: string,
  ) {
    return this.auditService.getDevicePerformance(accountId, runId);
  }

  // =========================================================================
  // AUDIT ISSUES
  // =========================================================================

  @Post('accounts/:accountId/analyze')
  async runAuditAnalysis(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('runId') runId?: string,
  ) {
    const targetRunId = runId || (await this.auditService.getLatestRun(accountId))?.runId;
    if (!targetRunId) {
      return { success: false, message: 'No import run found' };
    }
    const issueCount = await this.auditRulesService.runAllRules(accountId, targetRunId);
    return { success: true, issueCount, runId: targetRunId };
  }

  @Get('accounts/:accountId/issues')
  async getIssues(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: IssueFilterDto,
  ) {
    return this.auditService.getIssues(accountId, filters);
  }

  @Get('accounts/:accountId/issues/summary')
  async getIssueSummary(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('runId') runId?: string,
  ) {
    return this.auditRulesService.getIssueSummary(accountId, runId);
  }

  @Patch('accounts/:accountId/issues/:issueId')
  async updateIssueStatus(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Param('issueId', ParseUUIDPipe) issueId: string,
    @Body('status') status: 'acknowledged' | 'resolved' | 'ignored',
  ) {
    return this.auditService.updateIssueStatus(accountId, issueId, status);
  }

  // =========================================================================
  // DEBUG/DIAGNOSTICS
  // =========================================================================

  @Get('accounts/:accountId/debug/data-status')
  async getDataStatus(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.auditService.getDataStatus(accountId);
  }
}
