import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ModificationsService } from './modifications.service';
import {
  Modification,
  ModificationStatus,
  ModificationEntityType,
  ModificationType,
} from '../../entities/modification.entity';
import { GoogleAdsAccount } from '../../entities/google-ads-account.entity';
import { User, UserRole } from '../../entities/user.entity';
import { AIAnalysisLog } from '../../entities/ai-analysis-log.entity';

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockAccount = (overrides = {}): Partial<GoogleAdsAccount> => ({
  id: 'account-uuid-1',
  customerId: '1234567890',
  customerName: 'Test Account',
  isActive: true,
  ...overrides,
});

const mockUser = (overrides = {}): Partial<User> => ({
  id: 'user-uuid-1',
  email: 'admin@karalisweb.net',
  role: UserRole.ADMIN,
  ...overrides,
});

const mockModification = (overrides = {}): Partial<Modification> => ({
  id: 'mod-uuid-1',
  accountId: 'account-uuid-1',
  entityType: ModificationEntityType.KEYWORD,
  entityId: 'kw-123',
  entityName: 'test keyword',
  modificationType: ModificationType.KEYWORD_STATUS,
  beforeValue: { status: 'ENABLED' },
  afterValue: { status: 'PAUSED' },
  status: ModificationStatus.PENDING,
  createdById: 'user-uuid-1',
  createdAt: new Date('2026-03-01'),
  updatedAt: new Date('2026-03-01'),
  ...overrides,
});

const createMockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto: any) => dto),
  update: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
  delete: jest.fn(),
});

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('ModificationsService', () => {
  let service: ModificationsService;
  let modRepo: ReturnType<typeof createMockRepository>;
  let accountRepo: ReturnType<typeof createMockRepository>;
  let userRepo: ReturnType<typeof createMockRepository>;
  let analysisLogRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    modRepo = createMockRepository();
    accountRepo = createMockRepository();
    userRepo = createMockRepository();
    analysisLogRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModificationsService,
        { provide: getRepositoryToken(Modification), useValue: modRepo },
        { provide: getRepositoryToken(GoogleAdsAccount), useValue: accountRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(AIAnalysisLog), useValue: analysisLogRepo },
      ],
    }).compile();

    service = module.get<ModificationsService>(ModificationsService);
  });

  // ── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return modification when found', async () => {
      const mod = mockModification();
      modRepo.findOne.mockResolvedValue(mod);

      const result = await service.findOne('mod-uuid-1');

      expect(result).toEqual(mod);
      expect(modRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'mod-uuid-1' },
        relations: ['createdBy', 'approvedBy', 'account'],
      });
    });

    it('should throw NotFoundException when not found', async () => {
      modRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a modification in pending state', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount());
      modRepo.save.mockImplementation((entity: any) => Promise.resolve({ id: 'new-mod-id', ...entity }));

      const dto = {
        accountId: 'account-uuid-1',
        entityType: ModificationEntityType.KEYWORD,
        entityId: 'kw-456',
        entityName: 'new keyword',
        modificationType: ModificationType.KEYWORD_CPC_BID,
        afterValue: { cpcBid: 1.5 },
      };

      const result = await service.create(dto as any, 'user-uuid-1');

      expect(result.status).toBe(ModificationStatus.PENDING);
      expect(result.createdById).toBe('user-uuid-1');
    });

    it('should throw when account not found', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({ accountId: 'bad-id' } as any, 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── approve ──────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('should approve a pending modification (admin only)', async () => {
      const mod = mockModification({ status: ModificationStatus.PENDING });
      modRepo.findOne.mockResolvedValue(mod);
      userRepo.findOne.mockResolvedValue(mockUser({ role: UserRole.ADMIN }));
      modRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.approve('mod-uuid-1', 'user-uuid-1');

      expect(result.status).toBe(ModificationStatus.APPROVED);
      expect(result.approvedById).toBe('user-uuid-1');
      expect(result.approvedAt).toBeInstanceOf(Date);
    });

    it('should reject non-admin approval', async () => {
      const mod = mockModification({ status: ModificationStatus.PENDING });
      modRepo.findOne.mockResolvedValue(mod);
      userRepo.findOne.mockResolvedValue(mockUser({ role: UserRole.USER }));

      await expect(
        service.approve('mod-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject approval of non-pending modification', async () => {
      const mod = mockModification({ status: ModificationStatus.APPLIED });
      modRepo.findOne.mockResolvedValue(mod);
      userRepo.findOne.mockResolvedValue(mockUser({ role: UserRole.ADMIN }));

      await expect(
        service.approve('mod-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── reject ───────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('should reject a pending modification with reason', async () => {
      const mod = mockModification({ status: ModificationStatus.PENDING });
      modRepo.findOne.mockResolvedValue(mod);
      userRepo.findOne.mockResolvedValue(mockUser({ role: UserRole.ADMIN }));
      modRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.reject('mod-uuid-1', 'user-uuid-1', 'Not useful');

      expect(result.status).toBe(ModificationStatus.REJECTED);
      expect(result.rejectionReason).toBe('Not useful');
    });

    it('should reject non-admin rejection', async () => {
      const mod = mockModification({ status: ModificationStatus.PENDING });
      modRepo.findOne.mockResolvedValue(mod);
      userRepo.findOne.mockResolvedValue(mockUser({ role: UserRole.USER }));

      await expect(
        service.reject('mod-uuid-1', 'user-uuid-1', 'reason'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should throw when account not found', async () => {
      accountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findAll('bad-id', {} as any, 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return paginated results with filters', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount());

      const mockQB = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockModification()], 1]),
      };
      modRepo.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.findAll(
        'account-uuid-1',
        { status: ModificationStatus.PENDING, page: 1, limit: 10 } as any,
        'user-uuid-1',
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should cap limit at 100', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount());

      const mockQB = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      modRepo.createQueryBuilder.mockReturnValue(mockQB);

      await service.findAll(
        'account-uuid-1',
        { limit: 999 } as any,
        'user-uuid-1',
      );

      expect(mockQB.take).toHaveBeenCalledWith(100);
    });

    it('should prevent SQL injection via sortBy', async () => {
      accountRepo.findOne.mockResolvedValue(mockAccount());

      const mockQB = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      modRepo.createQueryBuilder.mockReturnValue(mockQB);

      await service.findAll(
        'account-uuid-1',
        { sortBy: 'DROP TABLE users; --' } as any,
        'user-uuid-1',
      );

      // Should fallback to createdAt since the injected string isn't in allowedSortFields
      expect(mockQB.orderBy).toHaveBeenCalledWith('modification.createdAt', 'DESC');
    });
  });
});
