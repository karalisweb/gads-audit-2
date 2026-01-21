import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from './audit.service';
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

// Mock query builder per testare la logica SQL
const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(0),
  getMany: jest.fn().mockResolvedValue([]),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue({}),
  getRawMany: jest.fn().mockResolvedValue([]),
});

const createMockRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
});

describe('AuditService - Negative Keywords Exclusion', () => {
  let service: AuditService;
  let keywordRepository: Repository<Keyword>;
  let importRunRepository: Repository<ImportRun>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(GoogleAdsAccount), useValue: createMockRepository() },
        { provide: getRepositoryToken(ImportRun), useValue: createMockRepository() },
        { provide: getRepositoryToken(Campaign), useValue: createMockRepository() },
        { provide: getRepositoryToken(AdGroup), useValue: createMockRepository() },
        { provide: getRepositoryToken(Ad), useValue: createMockRepository() },
        { provide: getRepositoryToken(Keyword), useValue: createMockRepository() },
        { provide: getRepositoryToken(SearchTerm), useValue: createMockRepository() },
        { provide: getRepositoryToken(NegativeKeyword), useValue: createMockRepository() },
        { provide: getRepositoryToken(Asset), useValue: createMockRepository() },
        { provide: getRepositoryToken(ConversionAction), useValue: createMockRepository() },
        { provide: getRepositoryToken(GeoPerformance), useValue: createMockRepository() },
        { provide: getRepositoryToken(DevicePerformance), useValue: createMockRepository() },
        { provide: getRepositoryToken(AuditIssue), useValue: createMockRepository() },
        { provide: getRepositoryToken(User), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    keywordRepository = module.get(getRepositoryToken(Keyword));
    importRunRepository = module.get(getRepositoryToken(ImportRun));
  });

  describe('getKeywords - negative keyword exclusion SQL', () => {
    it('should build correct NOT EXISTS subquery for negative keywords', async () => {
      // Setup mock per importRunRepository.findOne
      const mockRun = { runId: 'test-run-123' };
      (importRunRepository.findOne as jest.Mock).mockResolvedValue(mockRun);

      const mockQb = createMockQueryBuilder();
      (keywordRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQb);

      await service.getKeywords('test-account-id', {});

      // Verifica che andWhere sia chiamato con la query NOT EXISTS
      const andWhereCalls = mockQb.andWhere.mock.calls;

      // Trova la chiamata con NOT EXISTS
      const notExistsCall = andWhereCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('NOT EXISTS')
      );

      expect(notExistsCall).toBeDefined();

      if (notExistsCall) {
        const sql = notExistsCall[0] as string;

        // Verifica che la query copra tutti i livelli:
        // 1. AD_GROUP level: nk.ad_group_id = kw.ad_group_id
        expect(sql).toContain('nk.ad_group_id = kw.ad_group_id');

        // 2. CAMPAIGN level: same campaign, no ad_group
        expect(sql).toContain('nk.campaign_id = kw.campaign_id');
        expect(sql).toMatch(/nk\.ad_group_id IS NULL|nk\.ad_group_id = ''/);

        // 3. ACCOUNT level: no campaign_id (applies to all)
        expect(sql).toMatch(/nk\.campaign_id IS NULL|nk\.campaign_id = ''/);

        // 4. Case insensitive matching
        expect(sql).toContain('LOWER(nk.keyword_text) = LOWER(kw.keyword_text)');

        // 5. Same account
        expect(sql).toContain('nk.account_id = kw.account_id');
      }
    });
  });
});

/**
 * TEST CASES per la logica di esclusione negative keywords
 *
 * Scenario 1: AD_GROUP level negative
 * - Keyword: "scarpe rosse" in Ad Group A, Campaign X
 * - Negative: "scarpe rosse" in Ad Group A (level=AD_GROUP)
 * - Expected: Keyword ESCLUSA (match esatto su ad_group_id)
 *
 * Scenario 2: CAMPAIGN level negative
 * - Keyword: "scarpe rosse" in Ad Group A, Campaign X
 * - Negative: "scarpe rosse" in Campaign X, no ad_group_id (level=CAMPAIGN)
 * - Expected: Keyword ESCLUSA (campaign match, negative applies to all ad groups)
 *
 * Scenario 3: ACCOUNT level negative
 * - Keyword: "scarpe rosse" in Ad Group A, Campaign X
 * - Negative: "scarpe rosse" no campaign_id, no ad_group_id (level=ACCOUNT/SHARED_SET)
 * - Expected: Keyword ESCLUSA (account-wide negative)
 *
 * Scenario 4: Non-matching negative
 * - Keyword: "scarpe rosse" in Ad Group A, Campaign X
 * - Negative: "scarpe blu" in Ad Group A
 * - Expected: Keyword INCLUSA (different keyword text)
 *
 * Scenario 5: Case insensitive
 * - Keyword: "Scarpe Rosse" in Ad Group A
 * - Negative: "scarpe rosse" in Ad Group A
 * - Expected: Keyword ESCLUSA (case insensitive match)
 *
 * Scenario 6: Different ad group negative
 * - Keyword: "scarpe rosse" in Ad Group A, Campaign X
 * - Negative: "scarpe rosse" in Ad Group B, Campaign X (level=AD_GROUP)
 * - Expected: Keyword INCLUSA (different ad group, ad_group level negative)
 *
 * Scenario 7: Different campaign negative
 * - Keyword: "scarpe rosse" in Campaign X
 * - Negative: "scarpe rosse" in Campaign Y (level=CAMPAIGN)
 * - Expected: Keyword INCLUSA (different campaign)
 */
