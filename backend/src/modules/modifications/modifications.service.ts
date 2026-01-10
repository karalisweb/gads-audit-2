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
} from '../../entities/modification.entity';
import { GoogleAdsAccount } from '../../entities/google-ads-account.entity';
import { User, UserRole } from '../../entities/user.entity';
import {
  CreateModificationDto,
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
