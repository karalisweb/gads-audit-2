import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { ModificationsService } from '../modifications/modifications.service';
import { HmacAuthGuard } from './guards/hmac-auth.guard';
import { IngestDto } from './dto';
import { UpdateModificationResultDto } from '../modifications/dto';
import { GoogleAdsAccount } from '../../entities';
import { Public } from '../../common/decorators';

interface RequestWithAccount {
  googleAdsAccount: GoogleAdsAccount;
}

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly modificationsService: ModificationsService,
  ) {}

  @Public() // Skip JWT auth - uses HMAC instead
  @UseGuards(HmacAuthGuard)
  @Post('google-ads/ingest')
  @HttpCode(HttpStatus.OK)
  async ingest(@Req() req: RequestWithAccount, @Body() dto: IngestDto) {
    return this.integrationsService.ingest(req.googleAdsAccount, dto);
  }

  @Public() // Skip JWT auth - uses HMAC instead
  @UseGuards(HmacAuthGuard)
  @Get('google-ads/modifications/pending')
  async getPendingModifications(@Req() req: RequestWithAccount) {
    const modifications = await this.modificationsService.getPendingForAccount(
      req.googleAdsAccount.customerId,
    );

    // Transform to a format the script can easily consume
    return {
      modifications: modifications.map((mod) => ({
        id: mod.id,
        entityType: mod.entityType,
        entityId: mod.entityId,
        entityName: mod.entityName,
        modificationType: mod.modificationType,
        beforeValue: mod.beforeValue,
        afterValue: mod.afterValue,
      })),
    };
  }

  @Public() // Skip JWT auth - uses HMAC instead
  @UseGuards(HmacAuthGuard)
  @Post('google-ads/modifications/:id/start')
  @HttpCode(HttpStatus.OK)
  async startModification(@Param('id') id: string) {
    return this.modificationsService.markAsProcessing(id);
  }

  @Public() // Skip JWT auth - uses HMAC instead
  @UseGuards(HmacAuthGuard)
  @Post('google-ads/modifications/:id/result')
  @HttpCode(HttpStatus.OK)
  async updateModificationResult(
    @Param('id') id: string,
    @Body() result: UpdateModificationResultDto,
  ) {
    return this.modificationsService.updateResult(id, result);
  }
}
