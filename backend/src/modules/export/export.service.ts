import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { ChangeSet, ChangeSetStatus } from '../../entities/change-set.entity';
import { Decision, DecisionStatus } from '../../entities/decision.entity';
import { GoogleAdsAccount } from '../../entities/google-ads-account.entity';
import { CreateChangeSetDto, UpdateChangeSetDto, ChangeSetFiltersDto } from './dto';
import { CsvGeneratorService } from './csv-generator.service';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(ChangeSet)
    private changeSetsRepository: Repository<ChangeSet>,
    @InjectRepository(Decision)
    private decisionsRepository: Repository<Decision>,
    @InjectRepository(GoogleAdsAccount)
    private accountsRepository: Repository<GoogleAdsAccount>,
    private csvGeneratorService: CsvGeneratorService,
    private dataSource: DataSource,
  ) {}

  async findAll(accountId: string, filters: ChangeSetFiltersDto) {
    const account = await this.accountsRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    const queryBuilder = this.changeSetsRepository
      .createQueryBuilder('changeSet')
      .leftJoinAndSelect('changeSet.createdBy', 'createdBy')
      .loadRelationCountAndMap('changeSet.decisionsCount', 'changeSet.decisions')
      .where('changeSet.accountId = :accountId', { accountId });

    if (filters.status) {
      queryBuilder.andWhere('changeSet.status = :status', { status: filters.status });
    }

    const allowedSortFields = ['createdAt', 'name', 'status', 'exportedAt'];
    const sortField = filters.sortBy && allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'createdAt';
    const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`changeSet.${sortField}`, sortOrder);

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
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
    const changeSet = await this.changeSetsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'decisions', 'account'],
    });

    if (!changeSet) {
      throw new NotFoundException(`ChangeSet ${id} not found`);
    }

    return changeSet;
  }

  async create(dto: CreateChangeSetDto, userId: string) {
    const account = await this.accountsRepository.findOne({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account ${dto.accountId} not found`);
    }

    const changeSet = this.changeSetsRepository.create({
      accountId: dto.accountId,
      name: dto.name,
      description: dto.description,
      status: ChangeSetStatus.DRAFT,
      createdById: userId,
    });

    const savedChangeSet = await this.changeSetsRepository.save(changeSet);

    if (dto.decisionIds?.length) {
      await this.addDecisions(savedChangeSet.id, dto.decisionIds);
    }

    return this.findOne(savedChangeSet.id);
  }

  async update(id: string, dto: UpdateChangeSetDto, userId: string) {
    const changeSet = await this.findOne(id);

    if (changeSet.status === ChangeSetStatus.EXPORTED) {
      throw new BadRequestException('Cannot update an exported change set');
    }

    if (dto.name) changeSet.name = dto.name;
    if (dto.description !== undefined) changeSet.description = dto.description;

    await this.changeSetsRepository.save(changeSet);

    if (dto.decisionIds !== undefined) {
      await this.decisionsRepository.update(
        { changeSetId: id },
        { changeSetId: null },
      );

      if (dto.decisionIds.length > 0) {
        await this.addDecisions(id, dto.decisionIds);
      }
    }

    return this.findOne(id);
  }

  async addDecisions(changeSetId: string, decisionIds: string[]) {
    const changeSet = await this.findOne(changeSetId);

    if (changeSet.status === ChangeSetStatus.EXPORTED) {
      throw new BadRequestException('Cannot add decisions to an exported change set');
    }

    const decisions = await this.decisionsRepository.find({
      where: {
        id: In(decisionIds),
        isCurrent: true,
      },
    });

    if (decisions.length !== decisionIds.length) {
      throw new BadRequestException('Some decisions not found or are not current versions');
    }

    const alreadyExported = decisions.filter(d =>
      d.status === DecisionStatus.EXPORTED || d.status === DecisionStatus.APPLIED
    );

    if (alreadyExported.length > 0) {
      throw new BadRequestException('Some decisions are already exported or applied');
    }

    await this.decisionsRepository.update(
      { id: In(decisionIds) },
      { changeSetId },
    );

    return this.findOne(changeSetId);
  }

  async removeDecision(changeSetId: string, decisionId: string) {
    const changeSet = await this.findOne(changeSetId);

    if (changeSet.status === ChangeSetStatus.EXPORTED) {
      throw new BadRequestException('Cannot remove decisions from an exported change set');
    }

    await this.decisionsRepository.update(
      { id: decisionId, changeSetId },
      { changeSetId: null },
    );

    return this.findOne(changeSetId);
  }

  async approve(id: string, userId: string) {
    const changeSet = await this.findOne(id);

    if (changeSet.status !== ChangeSetStatus.DRAFT) {
      throw new BadRequestException('Only draft change sets can be approved');
    }

    if (!changeSet.decisions || changeSet.decisions.length === 0) {
      throw new BadRequestException('Cannot approve an empty change set');
    }

    const notApproved = changeSet.decisions.filter(d =>
      d.status === DecisionStatus.DRAFT
    );

    if (notApproved.length > 0) {
      await this.decisionsRepository.update(
        { id: In(notApproved.map(d => d.id)) },
        { status: DecisionStatus.APPROVED },
      );
    }

    changeSet.status = ChangeSetStatus.APPROVED;
    changeSet.approvedAt = new Date();
    return this.changeSetsRepository.save(changeSet);
  }

  async export(id: string, userId: string) {
    const changeSet = await this.findOne(id);

    if (changeSet.status === ChangeSetStatus.DRAFT) {
      throw new BadRequestException('Change set must be approved before export');
    }

    if (changeSet.status === ChangeSetStatus.EXPORTED) {
      throw new BadRequestException('Change set is already exported');
    }

    if (!changeSet.decisions || changeSet.decisions.length === 0) {
      throw new BadRequestException('Cannot export an empty change set');
    }

    const files = this.csvGeneratorService.generateCsvFiles(changeSet.decisions);

    const exportFiles = files.map(f => ({
      filename: f.filename,
      rows: f.rows,
    }));

    const contentHash = crypto
      .createHash('sha256')
      .update(files.map(f => f.content).join(''))
      .digest('hex');

    await this.dataSource.transaction(async (manager) => {
      await manager.update(ChangeSet, { id }, {
        status: ChangeSetStatus.EXPORTED,
        exportFiles,
        exportHash: contentHash,
        exportedAt: new Date(),
      });

      await manager.update(
        Decision,
        { id: In(changeSet.decisions.map(d => d.id)) },
        {
          status: DecisionStatus.EXPORTED,
          exportedAt: new Date(),
        },
      );
    });

    return this.findOne(id);
  }

  async download(id: string): Promise<{ stream: PassThrough; filename: string }> {
    const changeSet = await this.findOne(id);

    if (changeSet.status !== ChangeSetStatus.EXPORTED) {
      throw new BadRequestException('Change set must be exported before download');
    }

    const files = this.csvGeneratorService.generateCsvFiles(changeSet.decisions);
    const readme = this.csvGeneratorService.generateReadme(
      files,
      changeSet.name,
      changeSet.account?.customerName || 'Unknown Account',
    );

    const passThrough = new PassThrough();
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(passThrough);

    archive.append(readme, { name: 'README.md' });

    for (const file of files) {
      archive.append(file.content, { name: file.filename });
    }

    archive.finalize();

    const safeName = changeSet.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `export_${safeName}_${Date.now()}.zip`;

    return { stream: passThrough, filename };
  }

  async markAsApplied(id: string, userId: string) {
    const changeSet = await this.findOne(id);

    if (changeSet.status !== ChangeSetStatus.EXPORTED) {
      throw new BadRequestException('Only exported change sets can be marked as applied');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(ChangeSet, { id }, {
        status: ChangeSetStatus.APPLIED,
      });

      await manager.update(
        Decision,
        { id: In(changeSet.decisions.map(d => d.id)) },
        {
          status: DecisionStatus.APPLIED,
          appliedAt: new Date(),
        },
      );
    });

    return this.findOne(id);
  }

  async delete(id: string, userId: string) {
    const changeSet = await this.findOne(id);

    if (changeSet.status === ChangeSetStatus.APPLIED) {
      throw new BadRequestException('Cannot delete an applied change set');
    }

    await this.decisionsRepository.update(
      { changeSetId: id },
      { changeSetId: null },
    );

    await this.changeSetsRepository.delete(id);

    return { deleted: true, id };
  }

  async getExportableDecisions(accountId: string) {
    const decisions = await this.decisionsRepository.find({
      where: {
        accountId,
        isCurrent: true,
        status: In([DecisionStatus.DRAFT, DecisionStatus.APPROVED]),
        changeSetId: null as any,
      },
      order: { moduleId: 'ASC', entityType: 'ASC' },
    });

    return decisions;
  }

  async previewExport(changeSetId: string) {
    const changeSet = await this.findOne(changeSetId);

    if (!changeSet.decisions || changeSet.decisions.length === 0) {
      return { files: [], preview: [] };
    }

    const files = this.csvGeneratorService.generateCsvFiles(changeSet.decisions);

    return {
      files: files.map(f => ({
        filename: f.filename,
        rows: f.rows,
        preview: f.content.split('\n').slice(0, 6).join('\n'),
      })),
    };
  }
}
