import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { AIService } from './ai.service';
import {
  AnalyzeModuleDto,
  AIAnalysisResponse,
} from './dto';
import { CurrentUser } from '../../common/decorators';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  // Le analisi avviate manualmente sono abilitate solo dopo che l'utente ha
  // dato contesto strategico chattando nel Report AI. (Lo scheduler automatico
  // chiama il service direttamente e non passa di qui, quindi non è bloccato.)
  private async ensureReportChat(accountId: string): Promise<void> {
    const hasChat = await this.aiService.reportHasChat(accountId);
    if (!hasChat) {
      throw new BadRequestException(
        "Per lanciare le analisi AI, prima parla con l'AI nella chat del Report AI di questo account: serve a dare contesto strategico. Apri il Report AI, fai almeno una domanda, poi torna a lanciare l'analisi.",
      );
    }
  }

  /**
   * Indica se le analisi AI manuali sono abilitate (= esiste una chat nel Report AI)
   * GET /api/ai/report/:accountId/has-chat
   */
  @Get('report/:accountId/has-chat')
  async reportHasChat(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<{ hasChat: boolean }> {
    return { hasChat: await this.aiService.reportHasChat(accountId) };
  }

  /**
   * Analyze a specific module for an account
   * POST /api/ai/analyze/:accountId
   */
  @Post('analyze/:accountId')
  async analyzeModule(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: AnalyzeModuleDto,
  ): Promise<AIAnalysisResponse> {
    await this.ensureReportChat(accountId);
    return this.aiService.analyzeModule(accountId, dto.moduleId, dto.filters);
  }

  /**
   * Analyze all modules for an account
   * POST /api/ai/analyze-all/:accountId
   */
  @Post('analyze-all/:accountId')
  async analyzeAllModules(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.ensureReportChat(accountId);
    const { log } = await this.aiService.analyzeAllModules(accountId, userId);
    return log;
  }

  /**
   * Get AI analysis history for an account
   * GET /api/ai/history/:accountId
   */
  @Get('history/:accountId')
  async getAnalysisHistory(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiService.getAnalysisHistory(accountId, limit ? parseInt(limit, 10) : 10);
  }

  /**
   * Get modification acceptance rate for an account
   * GET /api/ai/acceptance-rate/:accountId
   */
  @Get('acceptance-rate/:accountId')
  async getAcceptanceRate(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.aiService.getAcceptanceRate(accountId);
  }

  /**
   * Get list of supported modules for AI analysis
   * GET /api/ai/modules
   */
  @Get('modules')
  getSupportedModules(): { moduleId: number; moduleName: string; moduleNameIt: string }[] {
    return this.aiService.getSupportedModules();
  }

  // =========================================================================
  // AUDIT REPORT + CHAT
  // =========================================================================

  @Post('report/:accountId')
  async generateReport(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.aiService.generateReport(accountId);
  }

  @Get('report/:accountId')
  async getLatestReport(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.aiService.getLatestReport(accountId);
  }

  @Post('report/:accountId/chat')
  async chatWithReport(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body('message') message: string,
    @Body('reportId') reportId?: string,
  ) {
    return this.aiService.chatWithReport(accountId, message, reportId);
  }

  @Get('report/:accountId/messages')
  async getReportMessages(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.aiService.getReportMessages(accountId);
  }

  // =========================================================================
  // REPORT HISTORY
  // =========================================================================

  @Get('reports/:accountId')
  async getReportHistory(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.aiService.getReportHistory(
      accountId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('reports/:accountId/:reportId')
  async getReportById(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ) {
    return this.aiService.getReportById(accountId, reportId);
  }

  @Get('reports/:accountId/:reportId/messages')
  async getReportMessagesById(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ) {
    return this.aiService.getReportMessagesById(reportId);
  }
}
