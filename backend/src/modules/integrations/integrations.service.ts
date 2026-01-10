import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  GoogleAdsAccount,
  ImportRun,
  ImportChunk,
  ImportStatus,
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
} from '../../entities';
import { IngestDto, DatasetName, VALID_DATASETS } from './dto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ImportRun)
    private readonly importRunRepository: Repository<ImportRun>,
    @InjectRepository(ImportChunk)
    private readonly importChunkRepository: Repository<ImportChunk>,
  ) {}

  async ingest(
    account: GoogleAdsAccount,
    dto: IngestDto,
  ): Promise<{ success: boolean; message: string; chunkId?: string }> {
    const { metadata, data } = dto;
    const { runId, datasetName, chunkIndex, chunkTotal, rowCount, datasetsExpected } = metadata;

    // Validate dataset name
    if (!VALID_DATASETS.includes(datasetName as DatasetName)) {
      throw new BadRequestException(`Invalid dataset name: ${datasetName}`);
    }

    // Check for duplicate chunk (idempotency)
    const existingChunk = await this.importChunkRepository.findOne({
      where: { runId, datasetName, chunkIndex },
    });

    if (existingChunk) {
      this.logger.warn(
        `Duplicate chunk received: ${runId}/${datasetName}/${chunkIndex}`,
      );
      return {
        success: true,
        message: 'Chunk already processed (idempotent)',
        chunkId: existingChunk.id,
      };
    }

    // Use transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create or get import run
      let importRun = await queryRunner.manager.findOne(ImportRun, {
        where: { runId },
      });

      if (!importRun) {
        importRun = queryRunner.manager.create(ImportRun, {
          runId,
          accountId: account.id,
          status: ImportStatus.IN_PROGRESS,
          datasetsExpected: datasetsExpected || VALID_DATASETS.length,
          datasetsReceived: 0,
          totalRows: 0,
          metadata: {
            dateRangeStart: metadata.dateRangeStart,
            dateRangeEnd: metadata.dateRangeEnd,
          },
        });
        await queryRunner.manager.save(importRun);
      }

      // Save chunk record
      const chunk = queryRunner.manager.create(ImportChunk, {
        runId,
        datasetName,
        chunkIndex,
        chunkTotal,
        rowCount,
      });
      await queryRunner.manager.save(chunk);

      // Process data based on dataset type
      await this.processDataset(
        queryRunner.manager,
        account.id,
        runId,
        datasetName as DatasetName,
        data,
        metadata.dateRangeStart,
        metadata.dateRangeEnd,
      );

      // Update import run stats
      importRun.totalRows += rowCount;

      // Check if this is the last chunk for this dataset
      const chunksForDataset = await queryRunner.manager.count(ImportChunk, {
        where: { runId, datasetName },
      });

      if (chunksForDataset === chunkTotal) {
        // This dataset is complete
        importRun.datasetsReceived += 1;

        // Check if all datasets are complete
        if (importRun.datasetsReceived >= importRun.datasetsExpected) {
          importRun.status = ImportStatus.COMPLETED;
          importRun.completedAt = new Date();
          this.logger.log(`Import run ${runId} completed`);
        }
      }

      await queryRunner.manager.save(importRun);
      await queryRunner.commitTransaction();

      this.logger.log(
        `Processed chunk ${chunkIndex + 1}/${chunkTotal} of ${datasetName} for run ${runId}`,
      );

      return {
        success: true,
        message: `Chunk ${chunkIndex + 1}/${chunkTotal} processed`,
        chunkId: chunk.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to process chunk: ${error.message}`,
        error.stack,
      );

      // Update import run with error if it exists
      const importRun = await this.importRunRepository.findOne({
        where: { runId },
      });
      if (importRun) {
        importRun.status = ImportStatus.FAILED;
        importRun.errorMessage = error.message;
        await this.importRunRepository.save(importRun);
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async processDataset(
    manager: EntityManager,
    accountId: string,
    runId: string,
    datasetName: DatasetName,
    data: Record<string, unknown>[],
    dateRangeStart?: string,
    dateRangeEnd?: string,
  ): Promise<void> {
    const dateStart = dateRangeStart ? new Date(dateRangeStart) : undefined;
    const dateEnd = dateRangeEnd ? new Date(dateRangeEnd) : undefined;

    switch (datasetName) {
      case 'campaigns':
        await this.processCampaigns(manager, accountId, runId, data, dateStart, dateEnd);
        break;
      case 'ad_groups':
        await this.processAdGroups(manager, accountId, runId, data, dateStart, dateEnd);
        break;
      case 'ads':
        await this.processAds(manager, accountId, runId, data, dateStart, dateEnd);
        break;
      case 'keywords':
        await this.processKeywords(manager, accountId, runId, data, dateStart, dateEnd);
        break;
      case 'search_terms':
        await this.processSearchTerms(manager, accountId, runId, data, dateStart, dateEnd);
        break;
      case 'negative_keywords':
        await this.processNegativeKeywords(manager, accountId, runId, data);
        break;
      case 'assets':
        await this.processAssets(manager, accountId, runId, data, dateStart, dateEnd);
        break;
      case 'conversion_actions':
        await this.processConversionActions(manager, accountId, runId, data);
        break;
      case 'geo_performance':
        await this.processGeoPerformance(manager, accountId, runId, data, dateStart, dateEnd);
        break;
      case 'device_performance':
        await this.processDevicePerformance(manager, accountId, runId, data, dateStart, dateEnd);
        break;
    }
  }

  private async processCampaigns(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
    dateStart?: Date,
    dateEnd?: Date,
  ): Promise<void> {
    for (const row of data) {
      await manager.upsert(
        Campaign,
        {
          accountId,
          runId,
          campaignId: String(row.campaign_id || row.campaignId),
          campaignName: String(row.campaign_name || row.campaignName || ''),
          status: String(row.status || ''),
          advertisingChannelType: String(row.advertising_channel_type || row.advertisingChannelType || ''),
          biddingStrategyType: String(row.bidding_strategy_type || row.biddingStrategyType || ''),
          targetCpaMicros: row.target_cpa_micros?.toString() || row.targetCpaMicros?.toString() || undefined,
          targetRoas: row.target_roas?.toString() || row.targetRoas?.toString() || undefined,
          budgetMicros: row.budget_micros?.toString() || row.budgetMicros?.toString() || undefined,
          impressions: String(row.impressions || 0),
          clicks: String(row.clicks || 0),
          costMicros: String(row.cost_micros || row.costMicros || 0),
          conversions: String(row.conversions || 0),
          conversionsValue: String(row.conversions_value || row.conversionsValue || 0),
          ctr: String(row.ctr || 0),
          averageCpcMicros: String(row.average_cpc_micros || row.averageCpcMicros || 0),
          searchImpressionShare: row.search_impression_share?.toString() || undefined,
          searchImpressionShareLostRank: row.search_impression_share_lost_rank?.toString() || undefined,
          searchImpressionShareLostBudget: row.search_impression_share_lost_budget?.toString() || undefined,
          searchTopImpressionShare: row.search_top_impression_share?.toString() || undefined,
          searchAbsoluteTopImpressionShare: row.search_absolute_top_impression_share?.toString() || undefined,
          topImpressionPercentage: row.top_impression_percentage?.toString() || undefined,
          absoluteTopImpressionPercentage: row.absolute_top_impression_percentage?.toString() || undefined,
          phoneCalls: Number(row.phone_calls || row.phoneCalls || 0),
          phoneImpressions: Number(row.phone_impressions || row.phoneImpressions || 0),
          messageChats: Number(row.message_chats || row.messageChats || 0),
          messageImpressions: Number(row.message_impressions || row.messageImpressions || 0),
          dataDateStart: dateStart,
          dataDateEnd: dateEnd,
        },
        ['accountId', 'runId', 'campaignId'],
      );
    }
  }

  private async processAdGroups(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
    dateStart?: Date,
    dateEnd?: Date,
  ): Promise<void> {
    for (const row of data) {
      await manager.upsert(
        AdGroup,
        {
          accountId,
          runId,
          adGroupId: String(row.ad_group_id || row.adGroupId),
          adGroupName: String(row.ad_group_name || row.adGroupName || ''),
          campaignId: String(row.campaign_id || row.campaignId),
          campaignName: String(row.campaign_name || row.campaignName || ''),
          status: String(row.status || ''),
          type: String(row.type || ''),
          cpcBidMicros: row.cpc_bid_micros?.toString() || row.cpcBidMicros?.toString() || undefined,
          targetCpaMicros: row.target_cpa_micros?.toString() || row.targetCpaMicros?.toString() || undefined,
          impressions: String(row.impressions || 0),
          clicks: String(row.clicks || 0),
          costMicros: String(row.cost_micros || row.costMicros || 0),
          conversions: String(row.conversions || 0),
          conversionsValue: String(row.conversions_value || row.conversionsValue || 0),
          ctr: String(row.ctr || 0),
          averageCpcMicros: String(row.average_cpc_micros || row.averageCpcMicros || 0),
          searchImpressionShare: row.search_impression_share?.toString() || undefined,
          searchImpressionShareLostRank: row.search_impression_share_lost_rank?.toString() || undefined,
          searchImpressionShareLostBudget: row.search_impression_share_lost_budget?.toString() || undefined,
          phoneCalls: Number(row.phone_calls || row.phoneCalls || 0),
          messageChats: Number(row.message_chats || row.messageChats || 0),
          dataDateStart: dateStart,
          dataDateEnd: dateEnd,
        },
        ['accountId', 'runId', 'adGroupId'],
      );
    }
  }

  private async processAds(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
    dateStart?: Date,
    dateEnd?: Date,
  ): Promise<void> {
    for (const row of data) {
      // Debug logging
      console.log('Processing ad:', row.ad_id, 'headlines:', JSON.stringify(row.headlines), 'final_urls:', JSON.stringify(row.final_urls));

      await manager.upsert(
        Ad,
        {
          accountId,
          runId,
          adId: String(row.ad_id || row.adId),
          adGroupId: String(row.ad_group_id || row.adGroupId),
          adGroupName: String(row.ad_group_name || row.adGroupName || ''),
          campaignId: String(row.campaign_id || row.campaignId),
          campaignName: String(row.campaign_name || row.campaignName || ''),
          adType: String(row.ad_type || row.adType || ''),
          status: String(row.status || ''),
          approvalStatus: String(row.approval_status || row.approvalStatus || ''),
          adStrength: String(row.ad_strength || row.adStrength || ''),
          headlines: row.headlines as object[] || [],
          descriptions: row.descriptions as object[] || [],
          finalUrls: (row.final_urls || row.finalUrls || []) as string[],
          path1: String(row.path1 || ''),
          path2: String(row.path2 || ''),
          impressions: String(row.impressions || 0),
          clicks: String(row.clicks || 0),
          costMicros: String(row.cost_micros || row.costMicros || 0),
          conversions: String(row.conversions || 0),
          conversionsValue: String(row.conversions_value || row.conversionsValue || 0),
          ctr: String(row.ctr || 0),
          averageCpcMicros: String(row.average_cpc_micros || row.averageCpcMicros || 0),
          phoneCalls: Number(row.phone_calls || row.phoneCalls || 0),
          messageChats: Number(row.message_chats || row.messageChats || 0),
          dataDateStart: dateStart,
          dataDateEnd: dateEnd,
        },
        ['accountId', 'runId', 'adId'],
      );
    }
  }

  private async processKeywords(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
    dateStart?: Date,
    dateEnd?: Date,
  ): Promise<void> {
    for (const row of data) {
      await manager.upsert(
        Keyword,
        {
          accountId,
          runId,
          keywordId: String(row.keyword_id || row.keywordId),
          keywordText: String(row.keyword_text || row.keywordText),
          matchType: String(row.match_type || row.matchType || ''),
          adGroupId: String(row.ad_group_id || row.adGroupId),
          adGroupName: String(row.ad_group_name || row.adGroupName || ''),
          campaignId: String(row.campaign_id || row.campaignId),
          campaignName: String(row.campaign_name || row.campaignName || ''),
          status: String(row.status || ''),
          approvalStatus: String(row.approval_status || row.approvalStatus || ''),
          cpcBidMicros: row.cpc_bid_micros?.toString() || row.cpcBidMicros?.toString() || undefined,
          finalUrl: String(row.final_url || row.finalUrl || ''),
          qualityScore: row.quality_score !== undefined ? Number(row.quality_score) : undefined,
          creativeRelevance: String(row.creative_relevance || row.creativeRelevance || ''),
          landingPageExperience: String(row.landing_page_experience || row.landingPageExperience || ''),
          expectedCtr: String(row.expected_ctr || row.expectedCtr || ''),
          impressions: String(row.impressions || 0),
          clicks: String(row.clicks || 0),
          costMicros: String(row.cost_micros || row.costMicros || 0),
          conversions: String(row.conversions || 0),
          conversionsValue: String(row.conversions_value || row.conversionsValue || 0),
          ctr: String(row.ctr || 0),
          averageCpcMicros: String(row.average_cpc_micros || row.averageCpcMicros || 0),
          searchImpressionShare: row.search_impression_share?.toString() || undefined,
          searchImpressionShareLostRank: row.search_impression_share_lost_rank?.toString() || undefined,
          searchImpressionShareLostBudget: row.search_impression_share_lost_budget?.toString() || undefined,
          phoneCalls: Number(row.phone_calls || row.phoneCalls || 0),
          dataDateStart: dateStart,
          dataDateEnd: dateEnd,
        },
        ['accountId', 'runId', 'keywordId'],
      );
    }
  }

  private async processSearchTerms(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
    dateStart?: Date,
    dateEnd?: Date,
  ): Promise<void> {
    for (const row of data) {
      await manager.insert(SearchTerm, {
        accountId,
        runId,
        searchTerm: String(row.search_term || row.searchTerm),
        keywordId: row.keyword_id?.toString() || row.keywordId?.toString() || undefined,
        keywordText: row.keyword_text?.toString() || row.keywordText?.toString() || undefined,
        matchTypeTriggered: String(row.match_type_triggered || row.matchTypeTriggered || ''),
        adGroupId: String(row.ad_group_id || row.adGroupId),
        adGroupName: String(row.ad_group_name || row.adGroupName || ''),
        campaignId: String(row.campaign_id || row.campaignId),
        campaignName: String(row.campaign_name || row.campaignName || ''),
        impressions: String(row.impressions || 0),
        clicks: String(row.clicks || 0),
        costMicros: String(row.cost_micros || row.costMicros || 0),
        conversions: String(row.conversions || 0),
        conversionsValue: String(row.conversions_value || row.conversionsValue || 0),
        ctr: String(row.ctr || 0),
        averageCpcMicros: String(row.average_cpc_micros || row.averageCpcMicros || 0),
        dataDateStart: dateStart,
        dataDateEnd: dateEnd,
      });
    }
  }

  private async processNegativeKeywords(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
  ): Promise<void> {
    for (const row of data) {
      await manager.insert(NegativeKeyword, {
        accountId,
        runId,
        negativeKeywordId: row.negative_keyword_id?.toString() || row.negativeKeywordId?.toString() || undefined,
        keywordText: String(row.keyword_text || row.keywordText),
        matchType: String(row.match_type || row.matchType || ''),
        level: String(row.level || ''),
        campaignId: row.campaign_id?.toString() || row.campaignId?.toString() || undefined,
        campaignName: row.campaign_name?.toString() || row.campaignName?.toString() || undefined,
        adGroupId: row.ad_group_id?.toString() || row.adGroupId?.toString() || undefined,
        adGroupName: row.ad_group_name?.toString() || row.adGroupName?.toString() || undefined,
        sharedSetId: row.shared_set_id?.toString() || row.sharedSetId?.toString() || undefined,
        sharedSetName: row.shared_set_name?.toString() || row.sharedSetName?.toString() || undefined,
      });
    }
  }

  private async processAssets(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
    dateStart?: Date,
    dateEnd?: Date,
  ): Promise<void> {
    for (const row of data) {
      await manager.upsert(
        Asset,
        {
          accountId,
          runId,
          assetId: String(row.asset_id || row.assetId),
          assetType: String(row.asset_type || row.assetType || ''),
          assetText: String(row.asset_text || row.assetText || ''),
          description1: String(row.description1 || ''),
          description2: String(row.description2 || ''),
          finalUrl: String(row.final_url || row.finalUrl || ''),
          phoneNumber: String(row.phone_number || row.phoneNumber || ''),
          status: String(row.status || ''),
          performanceLabel: String(row.performance_label || row.performanceLabel || ''),
          source: String(row.source || ''),
          linkedLevel: String(row.linked_level || row.linkedLevel || ''),
          campaignId: row.campaign_id?.toString() || row.campaignId?.toString() || undefined,
          adGroupId: row.ad_group_id?.toString() || row.adGroupId?.toString() || undefined,
          impressions: String(row.impressions || 0),
          clicks: String(row.clicks || 0),
          costMicros: String(row.cost_micros || row.costMicros || 0),
          conversions: String(row.conversions || 0),
          ctr: String(row.ctr || 0),
          dataDateStart: dateStart,
          dataDateEnd: dateEnd,
        },
        ['accountId', 'runId', 'assetId'],
      );
    }
  }

  private async processConversionActions(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
  ): Promise<void> {
    for (const row of data) {
      await manager.upsert(
        ConversionAction,
        {
          accountId,
          runId,
          conversionActionId: String(row.conversion_action_id || row.conversionActionId),
          name: String(row.name || ''),
          status: String(row.status || ''),
          type: String(row.type || ''),
          category: String(row.category || ''),
          origin: String(row.origin || ''),
          countingType: String(row.counting_type || row.countingType || ''),
          defaultValue: row.default_value != null ? String(row.default_value) : undefined,
          alwaysUseDefaultValue: Boolean(row.always_use_default_value || row.alwaysUseDefaultValue),
          primaryForGoal: Boolean(row.primary_for_goal || row.primaryForGoal),
          campaignsUsingCount: Number(row.campaigns_using_count || row.campaignsUsingCount || 0),
        },
        ['accountId', 'runId', 'conversionActionId'],
      );
    }
  }

  private async processGeoPerformance(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
    dateStart?: Date,
    dateEnd?: Date,
  ): Promise<void> {
    for (const row of data) {
      await manager.upsert(
        GeoPerformance,
        {
          accountId,
          runId,
          campaignId: String(row.campaign_id || row.campaignId),
          campaignName: String(row.campaign_name || row.campaignName || ''),
          locationId: String(row.location_id || row.locationId || ''),
          locationName: String(row.location_name || row.locationName || ''),
          locationType: String(row.location_type || row.locationType || ''),
          isTargeted: Boolean(row.is_targeted || row.isTargeted),
          bidModifier: this.parseNullableNumeric(row.bid_modifier),
          impressions: String(row.impressions || 0),
          clicks: String(row.clicks || 0),
          costMicros: String(row.cost_micros || row.costMicros || 0),
          conversions: String(row.conversions || 0),
          dataDateStart: dateStart,
          dataDateEnd: dateEnd,
        },
        ['accountId', 'runId', 'campaignId', 'locationId'],
      );
    }
  }

  private async processDevicePerformance(
    manager: EntityManager,
    accountId: string,
    runId: string,
    data: Record<string, unknown>[],
    dateStart?: Date,
    dateEnd?: Date,
  ): Promise<void> {
    for (const row of data) {
      await manager.upsert(
        DevicePerformance,
        {
          accountId,
          runId,
          campaignId: String(row.campaign_id || row.campaignId),
          campaignName: String(row.campaign_name || row.campaignName || ''),
          device: String(row.device || ''),
          bidModifier: this.parseNullableNumeric(row.bid_modifier),
          impressions: String(row.impressions || 0),
          clicks: String(row.clicks || 0),
          costMicros: String(row.cost_micros || row.costMicros || 0),
          conversions: String(row.conversions || 0),
          dataDateStart: dateStart,
          dataDateEnd: dateEnd,
        },
        ['accountId', 'runId', 'campaignId', 'device'],
      );
    }
  }

  /**
   * Parse a nullable numeric value, handling cases where the value is:
   * - undefined or null: returns undefined
   * - the string "null": returns undefined
   * - a valid number or numeric string: returns the string representation
   */
  private parseNullableNumeric(value: unknown): string | undefined {
    if (value === undefined || value === null || value === 'null' || value === '') {
      return undefined;
    }
    const num = Number(value);
    if (isNaN(num)) {
      return undefined;
    }
    return String(value);
  }
}
