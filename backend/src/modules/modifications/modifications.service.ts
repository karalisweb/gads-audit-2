import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Modification,
  ModificationStatus,
  ModificationEntityType,
  ModificationType,
} from '../../entities/modification.entity';
import { GoogleAdsAccount } from '../../entities/google-ads-account.entity';
import { User, UserRole } from '../../entities/user.entity';
import {
  CreateModificationDto,
  CreateFromAIDto,
  CreateFromAIResponse,
  CreateFromAIResponseItem,
  AIRecommendationItem,
  ModificationFiltersDto,
  UpdateModificationResultDto,
} from './dto';

@Injectable()
export class ModificationsService {
  constructor(
    @InjectRepository(Modification)
    private modificationsRepository: Repository<Modification>,
    @InjectRepository(GoogleAdsAccount)
    private accountsRepository: Repository<GoogleAdsAccount>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(
    accountId: string,
    filters: ModificationFiltersDto,
    userId: string,
  ) {
    const account = await this.accountsRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    const queryBuilder = this.modificationsRepository
      .createQueryBuilder('modification')
      .leftJoinAndSelect('modification.createdBy', 'createdBy')
      .leftJoinAndSelect('modification.approvedBy', 'approvedBy')
      .where('modification.accountId = :accountId', { accountId });

    if (filters.entityType) {
      queryBuilder.andWhere('modification.entityType = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters.modificationType) {
      queryBuilder.andWhere(
        'modification.modificationType = :modificationType',
        { modificationType: filters.modificationType },
      );
    }

    if (filters.status) {
      queryBuilder.andWhere('modification.status = :status', {
        status: filters.status,
      });
    }

    const allowedSortFields = [
      'createdAt',
      'entityType',
      'modificationType',
      'status',
      'entityName',
      'appliedAt',
    ];
    const sortField =
      filters.sortBy && allowedSortFields.includes(filters.sortBy)
        ? filters.sortBy
        : 'createdAt';
    const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`modification.${sortField}`, sortOrder);

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

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

  async findOne(id: string) {
    const modification = await this.modificationsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'approvedBy', 'account'],
    });

    if (!modification) {
      throw new NotFoundException(`Modification ${id} not found`);
    }

    return modification;
  }

  async create(dto: CreateModificationDto, userId: string) {
    const account = await this.accountsRepository.findOne({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${dto.accountId} not found`);
    }

    const modification = this.modificationsRepository.create({
      ...dto,
      status: ModificationStatus.PENDING,
      createdById: userId,
    });

    return this.modificationsRepository.save(modification);
  }

  async approve(id: string, userId: string) {
    const modification = await this.findOne(id);
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can approve modifications');
    }

    if (modification.status !== ModificationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending modifications can be approved',
      );
    }

    modification.status = ModificationStatus.APPROVED;
    modification.approvedById = userId;
    modification.approvedAt = new Date();

    return this.modificationsRepository.save(modification);
  }

  async reject(id: string, userId: string, reason: string) {
    const modification = await this.findOne(id);
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can reject modifications');
    }

    if (modification.status !== ModificationStatus.PENDING) {
      throw new BadRequestException(
        'Only pending modifications can be rejected',
      );
    }

    modification.status = ModificationStatus.REJECTED;
    modification.rejectionReason = reason;
    modification.approvedById = userId;
    modification.approvedAt = new Date();

    return this.modificationsRepository.save(modification);
  }

  async cancel(id: string, userId: string) {
    const modification = await this.findOne(id);

    if (modification.createdById !== userId) {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
      });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'You can only cancel your own modifications',
        );
      }
    }

    if (
      modification.status === ModificationStatus.APPLIED ||
      modification.status === ModificationStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Cannot cancel an applied or processing modification',
      );
    }

    modification.status = ModificationStatus.CANCELLED;
    return this.modificationsRepository.save(modification);
  }

  async bulkApprove(ids: string[], userId: string) {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await this.approve(id, userId);
        } catch (error) {
          return { id, error: error.message };
        }
      }),
    );

    return results;
  }

  async bulkReject(ids: string[], userId: string, reason: string) {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await this.reject(id, userId, reason);
        } catch (error) {
          return { id, error: error.message };
        }
      }),
    );

    return results;
  }

  async getPendingForAccount(customerId: string) {
    // Find account by customerId (Google Ads customer ID)
    const account = await this.accountsRepository.findOne({
      where: { customerId: customerId.replace(/-/g, '') },
    });

    if (!account) {
      return [];
    }

    const modifications = await this.modificationsRepository.find({
      where: {
        accountId: account.id,
        status: ModificationStatus.APPROVED,
      },
      order: { createdAt: 'ASC' },
    });

    return modifications;
  }

  async getFailedForAccount(customerId: string) {
    const account = await this.accountsRepository.findOne({
      where: { customerId: customerId.replace(/-/g, '') },
    });

    if (!account) {
      return [];
    }

    return this.modificationsRepository.find({
      where: {
        accountId: account.id,
        status: ModificationStatus.FAILED,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async deleteFailedForAccount(customerId: string) {
    const account = await this.accountsRepository.findOne({
      where: { customerId: customerId.replace(/-/g, '') },
    });

    if (!account) {
      return { deleted: 0 };
    }

    const result = await this.modificationsRepository.delete({
      accountId: account.id,
      status: ModificationStatus.FAILED,
    });

    return { deleted: result.affected || 0 };
  }

  async markAsProcessing(id: string) {
    const modification = await this.findOne(id);

    if (modification.status !== ModificationStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved modifications can be processed',
      );
    }

    modification.status = ModificationStatus.PROCESSING;
    return this.modificationsRepository.save(modification);
  }

  async updateResult(id: string, result: UpdateModificationResultDto) {
    const modification = await this.modificationsRepository.findOne({
      where: { id },
    });

    if (!modification) {
      throw new NotFoundException(`Modification ${id} not found`);
    }

    if (
      modification.status !== ModificationStatus.PROCESSING &&
      modification.status !== ModificationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Only processing or approved modifications can be updated',
      );
    }

    modification.status = result.success
      ? ModificationStatus.APPLIED
      : ModificationStatus.FAILED;
    modification.appliedAt = new Date();
    modification.resultMessage = result.message || '';
    modification.resultDetails = result.details || {};

    return this.modificationsRepository.save(modification);
  }

  // ═══════════════════════════════════════════════════════════
  // CREATE FROM AI RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════

  async createFromAI(
    dto: CreateFromAIDto,
    userId: string,
  ): Promise<CreateFromAIResponse> {
    const account = await this.accountsRepository.findOne({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${dto.accountId} not found`);
    }

    const results: CreateFromAIResponseItem[] = [];
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const rec of dto.recommendations) {
      try {
        const mapped = this.mapRecommendationToModification(
          rec,
          dto.accountId,
          dto.moduleId,
        );

        if (!mapped) {
          results.push({
            recommendationId: rec.id,
            status: 'skipped',
            error: `Azione "${rec.action}" non mappabile a una modifica`,
          });
          totalSkipped++;
          continue;
        }

        const modification = this.modificationsRepository.create({
          accountId: mapped.accountId,
          entityType: mapped.entityType,
          entityId: mapped.entityId,
          entityName: mapped.entityName,
          modificationType: mapped.modificationType,
          beforeValue: mapped.beforeValue ?? undefined,
          afterValue: mapped.afterValue,
          notes: mapped.notes,
          status: ModificationStatus.PENDING,
          createdById: userId,
        });

        const saved = await this.modificationsRepository.save(modification);

        results.push({
          recommendationId: rec.id,
          modificationId: saved.id,
          status: 'created',
        });
        totalCreated++;
      } catch (error) {
        results.push({
          recommendationId: rec.id,
          status: 'error',
          error: error.message || 'Errore sconosciuto',
        });
        totalErrors++;
      }
    }

    return { results, totalCreated, totalSkipped, totalErrors };
  }

  /**
   * Maps an AI recommendation to a modification DTO.
   * Returns null if the action is not mappable.
   */
  private mapRecommendationToModification(
    rec: AIRecommendationItem,
    accountId: string,
    moduleId: number,
  ): {
    accountId: string;
    entityType: ModificationEntityType;
    entityId: string;
    entityName: string;
    modificationType: ModificationType;
    beforeValue: Record<string, unknown> | null;
    afterValue: Record<string, unknown>;
    notes: string;
  } | null {
    const notes = [
      `[AI - Priorita: ${rec.priority}]`,
      rec.rationale || '',
      rec.expectedImpact ? `Impatto atteso: ${rec.expectedImpact}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const beforeValue = rec.currentValue
      ? { value: rec.currentValue }
      : null;

    // ─── NORMALIZZAZIONE entityId per keyword ───
    // Lo script Google Ads si aspetta il formato "adGroupId~keywordId"
    if (
      rec.entityType === 'keyword' &&
      rec.entityId &&
      !rec.entityId.includes('~') &&
      rec.adGroupId
    ) {
      rec.entityId = `${rec.adGroupId}~${rec.entityId}`;
    }

    // ─── SEARCH TERMS (module 22) ───
    if (rec.action === 'add_negative_campaign') {
      return {
        accountId,
        entityType: ModificationEntityType.NEGATIVE_KEYWORD,
        entityId: rec.campaignId || rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.NEGATIVE_KEYWORD_ADD,
        beforeValue: null,
        afterValue: {
          text: rec.entityName,
          matchType: this.normalizeMatchType(rec.suggestedValue),
          level: 'CAMPAIGN',
          campaignId: rec.campaignId || rec.entityId,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'add_negative_adgroup') {
      return {
        accountId,
        entityType: ModificationEntityType.NEGATIVE_KEYWORD,
        entityId: rec.adGroupId || rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.NEGATIVE_KEYWORD_ADD,
        beforeValue: null,
        afterValue: {
          text: rec.entityName,
          matchType: this.normalizeMatchType(rec.suggestedValue),
          level: 'AD_GROUP',
          campaignId: rec.campaignId || undefined,
          adGroupId: rec.adGroupId || rec.entityId,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'add_negative_account') {
      return {
        accountId,
        entityType: ModificationEntityType.NEGATIVE_KEYWORD,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.NEGATIVE_KEYWORD_ADD,
        beforeValue: null,
        afterValue: {
          text: rec.entityName,
          matchType: this.normalizeMatchType(rec.suggestedValue),
          level: 'ACCOUNT',
          campaignId: rec.campaignId || undefined,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'add_negative') {
      // Determine level from available data
      const level = rec.adGroupId ? 'AD_GROUP' : rec.campaignId ? 'CAMPAIGN' : 'CAMPAIGN';
      return {
        accountId,
        entityType: ModificationEntityType.NEGATIVE_KEYWORD,
        entityId: rec.campaignId || rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.NEGATIVE_KEYWORD_ADD,
        beforeValue: null,
        afterValue: {
          text: rec.entityName,
          matchType: this.normalizeMatchType(rec.suggestedValue),
          level,
          campaignId: rec.campaignId || undefined,
          adGroupId: rec.adGroupId || undefined,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'remove_negative') {
      return {
        accountId,
        entityType: ModificationEntityType.NEGATIVE_KEYWORD,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.NEGATIVE_KEYWORD_REMOVE,
        beforeValue: { text: rec.entityName },
        afterValue: {
          text: rec.entityName,
          removed: true,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'change_level' || rec.action === 'change_match_type') {
      return {
        accountId,
        entityType: ModificationEntityType.NEGATIVE_KEYWORD,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.NEGATIVE_KEYWORD_ADD,
        beforeValue,
        afterValue: {
          text: rec.entityName,
          matchType: this.normalizeMatchType(rec.suggestedValue),
          campaignId: rec.campaignId || undefined,
          adGroupId: rec.adGroupId || undefined,
          action: rec.action,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── PROMOTE SEARCH TERM TO KEYWORD ───
    if (rec.action === 'promote_to_keyword') {
      // entityId from AI is the campaignId; we need adGroupId to add the keyword
      const campaignId = rec.campaignId || rec.entityId;
      const adGroupId = rec.adGroupId;
      return {
        accountId,
        entityType: ModificationEntityType.KEYWORD,
        entityId: campaignId,
        entityName: rec.entityName,
        modificationType: ModificationType.KEYWORD_ADD,
        beforeValue: null,
        afterValue: {
          keyword: rec.entityName,
          matchType: this.normalizeMatchType(rec.suggestedValue),
          campaignId,
          adGroupId: adGroupId || undefined,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── CAMPAIGN ACTIONS ───
    if (rec.action === 'change_bidding_strategy') {
      return {
        accountId,
        entityType: ModificationEntityType.CAMPAIGN,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.CAMPAIGN_STATUS,
        beforeValue,
        afterValue: {
          biddingStrategy: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'adjust_target_cpa') {
      return {
        accountId,
        entityType: ModificationEntityType.CAMPAIGN,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.CAMPAIGN_TARGET_CPA,
        beforeValue,
        afterValue: {
          targetCpa: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'adjust_target_roas') {
      return {
        accountId,
        entityType: ModificationEntityType.CAMPAIGN,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.CAMPAIGN_TARGET_ROAS,
        beforeValue,
        afterValue: {
          targetRoas: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'increase_budget') {
      return {
        accountId,
        entityType: ModificationEntityType.CAMPAIGN,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.CAMPAIGN_BUDGET,
        beforeValue,
        afterValue: {
          budget: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'increase_campaign_budget') {
      return {
        accountId,
        entityType: ModificationEntityType.CAMPAIGN,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.CAMPAIGN_BUDGET,
        beforeValue,
        afterValue: {
          budget: rec.suggestedValue,
          budgetMicros: this.parseToMicros(rec.suggestedValue),
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── PAUSE ACTIONS (context-dependent entity type) ───
    if (rec.action === 'pause') {
      const entityType = this.inferEntityType(rec.entityType);
      const modificationType = this.inferStatusModificationType(entityType);
      if (!modificationType) return null;

      return {
        accountId,
        entityType,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType,
        beforeValue: beforeValue || { status: 'ENABLED' },
        afterValue: {
          status: 'PAUSED',
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── KEYWORD BID ACTIONS ───
    if (rec.action === 'increase_bid' || rec.action === 'decrease_bid') {
      const bidMicros = this.parseToMicros(rec.suggestedValue);
      // Se il valore non è numerico, crea suggerimento manuale invece di modifica automatica
      if (!bidMicros) {
        const entityType = this.inferEntityType(rec.entityType);
        const modificationType = this.inferStatusModificationType(entityType);
        if (!modificationType) return null;
        return {
          accountId,
          entityType,
          entityId: rec.entityId,
          entityName: rec.entityName,
          modificationType,
          beforeValue,
          afterValue: {
            action: rec.action,
            suggestedValue: rec.suggestedValue,
            source: 'ai_recommendation',
          },
          notes: `[Bid non numerico] ${notes}`,
        };
      }
      const entityType = this.inferEntityType(rec.entityType);
      if (entityType === ModificationEntityType.KEYWORD) {
        return {
          accountId,
          entityType: ModificationEntityType.KEYWORD,
          entityId: rec.entityId,
          entityName: rec.entityName,
          modificationType: ModificationType.KEYWORD_CPC_BID,
          beforeValue,
          afterValue: {
            cpcBid: rec.suggestedValue,
            cpcBidMicros: bidMicros,
            action: rec.action,
            source: 'ai_recommendation',
          },
          notes,
        };
      }
      if (entityType === ModificationEntityType.AD_GROUP) {
        return {
          accountId,
          entityType: ModificationEntityType.AD_GROUP,
          entityId: rec.entityId,
          entityName: rec.entityName,
          modificationType: ModificationType.AD_GROUP_CPC_BID,
          beforeValue,
          afterValue: {
            cpcBid: rec.suggestedValue,
            cpcBidMicros: bidMicros,
            action: rec.action,
            source: 'ai_recommendation',
          },
          notes,
        };
      }
      return null;
    }

    // ─── KEYWORD MATCH TYPE ───
    if (rec.action === 'change_match_type') {
      return {
        accountId,
        entityType: ModificationEntityType.KEYWORD,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.KEYWORD_STATUS,
        beforeValue,
        afterValue: {
          matchType: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── AD ACTIONS ───
    if (rec.action === 'add_headlines') {
      return {
        accountId,
        entityType: ModificationEntityType.AD,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.AD_HEADLINES,
        beforeValue,
        afterValue: {
          headlines: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'add_descriptions') {
      return {
        accountId,
        entityType: ModificationEntityType.AD,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.AD_DESCRIPTIONS,
        beforeValue,
        afterValue: {
          descriptions: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    if (rec.action === 'rewrite' || rec.action === 'unpin') {
      return {
        accountId,
        entityType: ModificationEntityType.AD,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.AD_HEADLINES,
        beforeValue,
        afterValue: {
          action: rec.action,
          suggestedValue: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── KEYWORD LANDING PAGE ───
    if (
      rec.action === 'improve_landing_page' ||
      rec.action === 'set_keyword_url' ||
      rec.action === 'create_specific_landing'
    ) {
      const isValidUrl = rec.suggestedValue && rec.suggestedValue.startsWith('http');

      if (isValidUrl) {
        // URL valido: crea modifica automatica keyword.final_url
        return {
          accountId,
          entityType: ModificationEntityType.KEYWORD,
          entityId: rec.entityId,
          entityName: rec.entityName,
          modificationType: ModificationType.KEYWORD_FINAL_URL,
          beforeValue,
          afterValue: {
            finalUrl: rec.suggestedValue,
            action: rec.action,
            source: 'ai_recommendation',
          },
          notes,
        };
      } else {
        // Testo descrittivo: crea suggerimento manuale (non automatizzabile)
        const entityType = this.inferEntityType(rec.entityType);
        const modificationType = this.inferStatusModificationType(entityType);
        if (!modificationType) return null;
        return {
          accountId,
          entityType,
          entityId: rec.entityId,
          entityName: rec.entityName,
          modificationType,
          beforeValue,
          afterValue: {
            action: rec.action,
            suggestedValue: rec.suggestedValue,
            source: 'ai_recommendation',
          },
          notes,
        };
      }
    }

    // ─── AD RELEVANCE (suggerimento manuale, non automatizzabile) ───
    if (rec.action === 'improve_ad_relevance') {
      const entityType = this.inferEntityType(rec.entityType);
      const modificationType = this.inferStatusModificationType(entityType);
      if (!modificationType) return null;
      return {
        accountId,
        entityType,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType,
        beforeValue,
        afterValue: {
          action: 'improve_relevance',
          suggestedValue: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── CONVERSION ACTIONS ───
    if (rec.action === 'set_primary' || rec.action === 'disable') {
      if (
        rec.entityType === 'conversion_action' ||
        rec.entityType === 'conversion'
      ) {
        return {
          accountId,
          entityType: ModificationEntityType.CONVERSION_ACTION,
          entityId: rec.entityId,
          entityName: rec.entityName,
          modificationType:
            rec.action === 'set_primary'
              ? ModificationType.CONVERSION_PRIMARY
              : ModificationType.CONVERSION_DEFAULT_VALUE,
          beforeValue,
          afterValue: {
            action: rec.action,
            suggestedValue: rec.suggestedValue,
            source: 'ai_recommendation',
          },
          notes,
        };
      }
    }

    // ─── GENERIC CAMPAIGN STATUS ACTIONS ───
    if (
      rec.action === 'scale' ||
      rec.action === 'restructure' ||
      rec.action === 'merge' ||
      rec.action === 'optimize' ||
      rec.action === 'improve_ctr' ||
      rec.action === 'improve_conversion_rate' ||
      rec.action === 'optimize_quality' ||
      rec.action === 'improve_quality' ||
      rec.action === 'improve_quality_score' ||
      rec.action === 'add_keyword_to_headline' ||
      rec.action === 'restructure_ad_group' ||
      rec.action === 'optimize_landing_page' ||
      rec.action === 'consolidate_urls'
    ) {
      const entityType = this.inferEntityType(rec.entityType);
      const modificationType = this.inferStatusModificationType(entityType);
      if (!modificationType) return null;

      return {
        accountId,
        entityType,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType,
        beforeValue,
        afterValue: {
          action: rec.action,
          suggestedValue: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── EXTENSION ACTIONS ───
    if (
      rec.action === 'add_call_extension' ||
      rec.action === 'add_message_extension' ||
      rec.action === 'optimize_schedule' ||
      rec.action === 'enable_tracking' ||
      rec.action === 'check_tracking' ||
      rec.action === 'optimize_for_calls' ||
      rec.action === 'optimize_for_leads' ||
      rec.action === 'enable_consent_mode' ||
      rec.action === 'verify_tags' ||
      rec.action === 'check_implementation'
    ) {
      return {
        accountId,
        entityType: ModificationEntityType.CAMPAIGN,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.CAMPAIGN_STATUS,
        beforeValue,
        afterValue: {
          action: rec.action,
          suggestedValue: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── AD STATUS ACTIONS ───
    if (rec.action === 'create_variant') {
      return {
        accountId,
        entityType: ModificationEntityType.AD,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.AD_STATUS,
        beforeValue,
        afterValue: {
          action: rec.action,
          suggestedValue: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── SCHEDULING / GEO EXCLUSION ───
    if (
      rec.action === 'exclude' ||
      rec.action === 'set_bid_modifier' ||
      rec.action === 'add_schedule'
    ) {
      return {
        accountId,
        entityType: ModificationEntityType.CAMPAIGN,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.CAMPAIGN_STATUS,
        beforeValue,
        afterValue: {
          action: rec.action,
          suggestedValue: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── SET VALUE (conversion) ───
    if (rec.action === 'set_value') {
      return {
        accountId,
        entityType: ModificationEntityType.CONVERSION_ACTION,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.CONVERSION_DEFAULT_VALUE,
        beforeValue,
        afterValue: {
          value: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── REMOVE (generic) ───
    if (rec.action === 'remove' || rec.action === 'replace' || rec.action === 'add_new') {
      const entityType = this.inferEntityType(rec.entityType);
      const modificationType = this.inferStatusModificationType(entityType);
      if (!modificationType) return null;

      return {
        accountId,
        entityType,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType,
        beforeValue,
        afterValue: {
          action: rec.action,
          suggestedValue: rec.suggestedValue,
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // ─── REDUCE BID (keyword-level context) ───
    if (rec.action === 'reduce_bid') {
      return {
        accountId,
        entityType: ModificationEntityType.KEYWORD,
        entityId: rec.entityId,
        entityName: rec.entityName,
        modificationType: ModificationType.KEYWORD_CPC_BID,
        beforeValue,
        afterValue: {
          cpcBid: rec.suggestedValue,
          cpcBidMicros: this.parseToMicros(rec.suggestedValue),
          action: 'decrease_bid',
          source: 'ai_recommendation',
        },
        notes,
      };
    }

    // Unmapped action — skip
    return null;
  }

  /**
   * Converte un valore in euro (es. "1.50", "25,00 EUR") in micros (es. 1500000).
   */
  private parseToMicros(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return undefined;
    return Math.round(num * 1_000_000);
  }

  /**
   * Normalizes match type from AI output to valid Google Ads values.
   */
  private normalizeMatchType(value: string | undefined): string {
    if (!value) return 'EXACT';
    const upper = value.toUpperCase().trim();
    if (['EXACT', 'PHRASE', 'BROAD'].includes(upper)) return upper;
    if (upper.includes('EXACT')) return 'EXACT';
    if (upper.includes('PHRASE')) return 'PHRASE';
    if (upper.includes('BROAD')) return 'BROAD';
    return 'EXACT';
  }

  /**
   * Infer the ModificationEntityType from the AI's entity type string
   */
  private inferEntityType(aiEntityType: string): ModificationEntityType {
    const mapping: Record<string, ModificationEntityType> = {
      campaign: ModificationEntityType.CAMPAIGN,
      ad_group: ModificationEntityType.AD_GROUP,
      adgroup: ModificationEntityType.AD_GROUP,
      ad: ModificationEntityType.AD,
      keyword: ModificationEntityType.KEYWORD,
      search_term: ModificationEntityType.KEYWORD,
      negative_keyword: ModificationEntityType.NEGATIVE_KEYWORD,
      conversion_action: ModificationEntityType.CONVERSION_ACTION,
      conversion: ModificationEntityType.CONVERSION_ACTION,
      extension: ModificationEntityType.CAMPAIGN,
      landing_page: ModificationEntityType.CAMPAIGN,
    };

    return mapping[aiEntityType.toLowerCase()] || ModificationEntityType.CAMPAIGN;
  }

  /**
   * Infer the status modification type from the entity type
   */
  private inferStatusModificationType(
    entityType: ModificationEntityType,
  ): ModificationType | null {
    const mapping: Record<ModificationEntityType, ModificationType> = {
      [ModificationEntityType.CAMPAIGN]: ModificationType.CAMPAIGN_STATUS,
      [ModificationEntityType.AD_GROUP]: ModificationType.AD_GROUP_STATUS,
      [ModificationEntityType.AD]: ModificationType.AD_STATUS,
      [ModificationEntityType.KEYWORD]: ModificationType.KEYWORD_STATUS,
      [ModificationEntityType.NEGATIVE_KEYWORD]:
        ModificationType.NEGATIVE_KEYWORD_ADD,
      [ModificationEntityType.CONVERSION_ACTION]:
        ModificationType.CONVERSION_PRIMARY,
    };

    return mapping[entityType] || null;
  }

  async getSummary(accountId: string) {
    const account = await this.accountsRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    const byStatusResult = await this.modificationsRepository
      .createQueryBuilder('modification')
      .select('modification.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('modification.accountId = :accountId', { accountId })
      .groupBy('modification.status')
      .getRawMany();

    const byEntityTypeResult = await this.modificationsRepository
      .createQueryBuilder('modification')
      .select('modification.entityType', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .where('modification.accountId = :accountId', { accountId })
      .groupBy('modification.entityType')
      .getRawMany();

    const totalResult = await this.modificationsRepository
      .createQueryBuilder('modification')
      .where('modification.accountId = :accountId', { accountId })
      .getCount();

    return {
      total: totalResult,
      byStatus: byStatusResult.reduce(
        (acc, item) => {
          acc[item.status] = parseInt(item.count, 10);
          return acc;
        },
        {} as Record<string, number>,
      ),
      byEntityType: byEntityTypeResult.reduce(
        (acc, item) => {
          acc[item.entityType] = parseInt(item.count, 10);
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
