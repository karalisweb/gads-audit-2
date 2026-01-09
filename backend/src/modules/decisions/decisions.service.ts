import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Decision, DecisionStatus } from '../../entities/decision.entity';
import { GoogleAdsAccount } from '../../entities/google-ads-account.entity';
import { ChangeSet } from '../../entities/change-set.entity';
import { CreateDecisionDto, UpdateDecisionDto, DecisionFiltersDto } from './dto';

@Injectable()
export class DecisionsService {
  constructor(
    @InjectRepository(Decision)
    private decisionsRepository: Repository<Decision>,
    @InjectRepository(GoogleAdsAccount)
    private accountsRepository: Repository<GoogleAdsAccount>,
    @InjectRepository(ChangeSet)
    private changeSetsRepository: Repository<ChangeSet>,
    private dataSource: DataSource,
  ) {}

  async findAll(accountId: string, filters: DecisionFiltersDto, userId: string) {
    const account = await this.accountsRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    const queryBuilder = this.decisionsRepository
      .createQueryBuilder('decision')
      .leftJoinAndSelect('decision.createdBy', 'createdBy')
      .leftJoinAndSelect('decision.changeSet', 'changeSet')
      .where('decision.accountId = :accountId', { accountId });

    if (filters.currentOnly !== false) {
      queryBuilder.andWhere('decision.isCurrent = true');
    }

    if (filters.moduleId) {
      queryBuilder.andWhere('decision.moduleId = :moduleId', { moduleId: filters.moduleId });
    }

    if (filters.entityType) {
      queryBuilder.andWhere('decision.entityType = :entityType', { entityType: filters.entityType });
    }

    if (filters.actionType) {
      queryBuilder.andWhere('decision.actionType = :actionType', { actionType: filters.actionType });
    }

    if (filters.status) {
      queryBuilder.andWhere('decision.status = :status', { status: filters.status });
    }

    const allowedSortFields = ['createdAt', 'moduleId', 'entityType', 'actionType', 'status', 'entityName'];
    const sortField = filters.sortBy && allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'createdAt';
    const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`decision.${sortField}`, sortOrder);

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
    const decision = await this.decisionsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'changeSet', 'audit'],
    });

    if (!decision) {
      throw new NotFoundException(`Decision ${id} not found`);
    }

    return decision;
  }

  async create(dto: CreateDecisionDto, userId: string) {
    const account = await this.accountsRepository.findOne({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${dto.accountId} not found`);
    }

    const decisionGroupId = uuidv4();

    const decision = this.decisionsRepository.create({
      ...dto,
      decisionGroupId,
      version: 1,
      isCurrent: true,
      status: DecisionStatus.DRAFT,
      createdById: userId,
    });

    return this.decisionsRepository.save(decision);
  }

  async update(id: string, dto: UpdateDecisionDto, userId: string) {
    const currentDecision = await this.findOne(id);

    if (!currentDecision.isCurrent) {
      throw new BadRequestException('Cannot update a non-current decision version');
    }

    if (currentDecision.status === DecisionStatus.EXPORTED || currentDecision.status === DecisionStatus.APPLIED) {
      throw new BadRequestException('Cannot update an exported or applied decision');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Decision, { id: currentDecision.id }, {
        isCurrent: false,
        supersededBy: null,
      });

      const newDecision = manager.create(Decision, {
        auditId: currentDecision.auditId,
        accountId: currentDecision.accountId,
        decisionGroupId: currentDecision.decisionGroupId,
        version: currentDecision.version + 1,
        isCurrent: true,
        moduleId: currentDecision.moduleId,
        entityType: currentDecision.entityType,
        entityId: currentDecision.entityId,
        entityName: currentDecision.entityName,
        actionType: currentDecision.actionType,
        beforeValue: currentDecision.beforeValue,
        afterValue: dto.afterValue ?? currentDecision.afterValue,
        rationale: dto.rationale ?? currentDecision.rationale,
        evidence: dto.evidence ?? currentDecision.evidence,
        status: DecisionStatus.DRAFT,
        createdById: userId,
      });

      const savedDecision = await manager.save(Decision, newDecision);

      await manager.update(Decision, { id: currentDecision.id }, {
        supersededBy: savedDecision.id,
      });

      return savedDecision;
    });
  }

  async getHistory(groupId: string) {
    const decisions = await this.decisionsRepository.find({
      where: { decisionGroupId: groupId },
      relations: ['createdBy'],
      order: { version: 'DESC' },
    });

    if (decisions.length === 0) {
      throw new NotFoundException(`No decisions found for group ${groupId}`);
    }

    return decisions;
  }

  async rollback(id: string, userId: string) {
    const currentDecision = await this.findOne(id);

    if (!currentDecision.isCurrent) {
      throw new BadRequestException('Cannot rollback a non-current decision version');
    }

    if (currentDecision.status === DecisionStatus.APPLIED) {
      throw new BadRequestException('Cannot rollback an applied decision');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Decision, { id: currentDecision.id }, {
        isCurrent: false,
      });

      const rollbackDecision = manager.create(Decision, {
        auditId: currentDecision.auditId,
        accountId: currentDecision.accountId,
        decisionGroupId: currentDecision.decisionGroupId,
        version: currentDecision.version + 1,
        isCurrent: true,
        moduleId: currentDecision.moduleId,
        entityType: currentDecision.entityType,
        entityId: currentDecision.entityId,
        entityName: currentDecision.entityName,
        actionType: 'ROLLBACK',
        beforeValue: currentDecision.afterValue,
        afterValue: currentDecision.beforeValue,
        rationale: `Rollback of version ${currentDecision.version}`,
        evidence: currentDecision.evidence,
        status: DecisionStatus.ROLLED_BACK,
        createdById: userId,
      });

      const savedDecision = await manager.save(Decision, rollbackDecision);

      await manager.update(Decision, { id: currentDecision.id }, {
        supersededBy: savedDecision.id,
      });

      return savedDecision;
    });
  }

  async approve(id: string, userId: string) {
    const decision = await this.findOne(id);

    if (!decision.isCurrent) {
      throw new BadRequestException('Cannot approve a non-current decision version');
    }

    if (decision.status !== DecisionStatus.DRAFT) {
      throw new BadRequestException('Only draft decisions can be approved');
    }

    decision.status = DecisionStatus.APPROVED;
    return this.decisionsRepository.save(decision);
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

  async delete(id: string, userId: string) {
    const decision = await this.findOne(id);

    if (decision.status === DecisionStatus.EXPORTED || decision.status === DecisionStatus.APPLIED) {
      throw new BadRequestException('Cannot delete an exported or applied decision');
    }

    await this.decisionsRepository.delete(id);
    return { deleted: true, id };
  }

  async getSummary(accountId: string) {
    const account = await this.accountsRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    const totalResult = await this.decisionsRepository
      .createQueryBuilder('decision')
      .where('decision.accountId = :accountId', { accountId })
      .andWhere('decision.isCurrent = true')
      .getCount();

    const byStatusResult = await this.decisionsRepository
      .createQueryBuilder('decision')
      .select('decision.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('decision.accountId = :accountId', { accountId })
      .andWhere('decision.isCurrent = true')
      .groupBy('decision.status')
      .getRawMany();

    const byModuleResult = await this.decisionsRepository
      .createQueryBuilder('decision')
      .select('decision.moduleId', 'moduleId')
      .addSelect('COUNT(*)', 'count')
      .where('decision.accountId = :accountId', { accountId })
      .andWhere('decision.isCurrent = true')
      .groupBy('decision.moduleId')
      .orderBy('decision.moduleId', 'ASC')
      .getRawMany();

    const byEntityTypeResult = await this.decisionsRepository
      .createQueryBuilder('decision')
      .select('decision.entityType', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .where('decision.accountId = :accountId', { accountId })
      .andWhere('decision.isCurrent = true')
      .groupBy('decision.entityType')
      .getRawMany();

    const byActionTypeResult = await this.decisionsRepository
      .createQueryBuilder('decision')
      .select('decision.actionType', 'actionType')
      .addSelect('COUNT(*)', 'count')
      .where('decision.accountId = :accountId', { accountId })
      .andWhere('decision.isCurrent = true')
      .groupBy('decision.actionType')
      .getRawMany();

    return {
      total: totalResult,
      byStatus: byStatusResult.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count, 10);
        return acc;
      }, {}),
      byModule: byModuleResult.reduce((acc, item) => {
        acc[item.moduleId] = parseInt(item.count, 10);
        return acc;
      }, {}),
      byEntityType: byEntityTypeResult.reduce((acc, item) => {
        acc[item.entityType] = parseInt(item.count, 10);
        return acc;
      }, {}),
      byActionType: byActionTypeResult.reduce((acc, item) => {
        acc[item.actionType] = parseInt(item.count, 10);
        return acc;
      }, {}),
    };
  }
}
