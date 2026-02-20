import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ModificationsService } from './modifications.service';
import { CreateModificationDto, CreateFromAIDto, ModificationFiltersDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('modifications')
export class ModificationsController {
  constructor(private readonly modificationsService: ModificationsService) {}

  @Get('pending-summary')
  async getPendingSummary() {
    return this.modificationsService.getPendingSummaryAllAccounts();
  }

  @Get('recent-activity')
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.modificationsService.getRecentActivity(limit || 20);
  }

  @Get('account/:accountId')
  async findAll(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: ModificationFiltersDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.modificationsService.findAll(accountId, filters, userId);
  }

  @Get('account/:accountId/summary')
  async getSummary(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.modificationsService.getSummary(accountId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.modificationsService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateModificationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.modificationsService.create(dto, userId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.modificationsService.approve(id, userId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.modificationsService.reject(id, userId, body.reason);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.modificationsService.cancel(id, userId);
  }

  @Post('bulk-approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(
    @Body() body: { ids: string[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.modificationsService.bulkApprove(body.ids, userId);
  }

  @Post('bulk-reject')
  @HttpCode(HttpStatus.OK)
  async bulkReject(
    @Body() body: { ids: string[]; reason: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.modificationsService.bulkReject(body.ids, userId, body.reason);
  }

  @Post('from-ai')
  async createFromAI(
    @Body() dto: CreateFromAIDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.modificationsService.createFromAI(dto, userId);
  }
}
