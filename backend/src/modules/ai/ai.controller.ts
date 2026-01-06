import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AIService } from './ai.service';
import {
  AnalyzeModuleDto,
  AIAnalysisResponse,
} from './dto';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  /**
   * Analyze a specific module for an account
   * POST /api/ai/analyze/:accountId
   */
  @Post('analyze/:accountId')
  async analyzeModule(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: AnalyzeModuleDto,
  ): Promise<AIAnalysisResponse> {
    return this.aiService.analyzeModule(accountId, dto.moduleId, dto.filters);
  }

  /**
   * Get list of supported modules for AI analysis
   * GET /api/ai/modules
   */
  @Get('modules')
  getSupportedModules(): { moduleId: number; moduleName: string; moduleNameIt: string }[] {
    return this.aiService.getSupportedModules();
  }
}
