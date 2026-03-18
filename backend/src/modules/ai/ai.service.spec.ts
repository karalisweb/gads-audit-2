import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AIService } from './ai.service';
import {
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
  GoogleAdsAccount,
  ImportRun,
  AIAnalysisLog,
  Modification,
  AuditReport,
  AuditReportMessage,
  AuditIssue,
} from '../../entities';
import { SettingsService } from '../settings/settings.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const createMockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn((dto: any) => dto),
  update: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const ALL_ENTITIES = [
  Campaign, AdGroup, Ad, Keyword, SearchTerm, NegativeKeyword,
  Asset, ConversionAction, GeoPerformance, DevicePerformance,
  GoogleAdsAccount, ImportRun, AIAnalysisLog, Modification,
  AuditReport, AuditReportMessage, AuditIssue,
];

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('AIService', () => {
  let service: AIService;
  let configService: { get: jest.Mock };
  let settingsService: {
    getAIProvider: jest.Mock;
    getOpenAIApiKey: jest.Mock;
    getGeminiApiKey: jest.Mock;
  };
  let importRunRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          'ai.aiProvider': 'openai',
          'ai.openaiApiKey': 'sk-test-key',
          'ai.openaiModel': 'gpt-4o',
          'ai.geminiApiKey': '',
        };
        return map[key] || '';
      }),
    };

    settingsService = {
      getAIProvider: jest.fn().mockResolvedValue('openai'),
      getOpenAIApiKey: jest.fn().mockResolvedValue('sk-test-key'),
      getGeminiApiKey: jest.fn().mockResolvedValue(null),
    };

    const providers: any[] = [
      AIService,
      { provide: ConfigService, useValue: configService },
      { provide: SettingsService, useValue: settingsService },
    ];

    // Create mock repositories for all entities
    const repos: Record<string, ReturnType<typeof createMockRepository>> = {};
    for (const entity of ALL_ENTITIES) {
      const repo = createMockRepository();
      repos[entity.name] = repo;
      providers.push({ provide: getRepositoryToken(entity), useValue: repo });
    }

    importRunRepo = repos['ImportRun'];

    const module: TestingModule = await Test.createTestingModule({
      providers,
    }).compile();

    service = module.get<AIService>(AIService);
  });

  // ── analyzeModule ────────────────────────────────────────────────────────

  describe('analyzeModule', () => {
    it('should throw on unsupported module ID', async () => {
      await expect(
        service.analyzeModule('account-uuid', 999),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when no import run data available', async () => {
      importRunRepo.findOne.mockResolvedValue(null);

      // Module 1 is typically "Campagne" - a supported module
      await expect(
        service.analyzeModule('account-uuid', 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getSupportedModules ──────────────────────────────────────────────────

  describe('getSupportedModules', () => {
    it('should return array of supported modules', () => {
      const modules = service.getSupportedModules();

      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
      expect(modules[0]).toHaveProperty('moduleId');
      expect(modules[0]).toHaveProperty('moduleName');
      expect(modules[0]).toHaveProperty('moduleNameIt');
    });
  });

  // ── Provider selection ───────────────────────────────────────────────────

  describe('provider selection', () => {
    it('should use settings provider over config', async () => {
      settingsService.getAIProvider.mockResolvedValue('gemini');

      // Access the private method via prototype
      const provider = await (service as any).getActiveProvider();

      expect(provider).toBe('gemini');
    });

    it('should fallback to config when settings return null', async () => {
      settingsService.getAIProvider.mockResolvedValue(null);

      const provider = await (service as any).getActiveProvider();

      expect(provider).toBe('openai');
    });

    it('should throw when OpenAI key is not configured', async () => {
      settingsService.getOpenAIApiKey.mockResolvedValue(null);
      configService.get.mockReturnValue(null);

      await expect(
        (service as any).getOpenAIClient(),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when Gemini key is not configured', async () => {
      settingsService.getGeminiApiKey.mockResolvedValue(null);
      configService.get.mockReturnValue(null);

      await expect(
        (service as any).getGeminiClient(),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
