import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { HmacAuthGuard } from './guards/hmac-auth.guard';
import { IngestDto } from './dto';
import { GoogleAdsAccount } from '../../entities';
import { Public } from '../../common/decorators';

interface RequestWithAccount {
  googleAdsAccount: GoogleAdsAccount;
}

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Public() // Skip JWT auth - uses HMAC instead
  @UseGuards(HmacAuthGuard)
  @Post('google-ads/ingest')
  @HttpCode(HttpStatus.OK)
  async ingest(
    @Req() req: RequestWithAccount,
    @Body() dto: IngestDto,
  ) {
    return this.integrationsService.ingest(req.googleAdsAccount, dto);
  }
}
