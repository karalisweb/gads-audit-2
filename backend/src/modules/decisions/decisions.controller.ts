import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { CreateDecisionDto, UpdateDecisionDto, DecisionFiltersDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('decisions')
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Get('audit/:auditId')
  async findAll(
    @Param('auditId', ParseUUIDPipe) auditId: string,
    @Query() filters: DecisionFiltersDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionsService.findAll(auditId, filters, userId);
  }

  @Get('audit/:auditId/summary')
  async getSummary(
    @Param('auditId', ParseUUIDPipe) auditId: string,
  ) {
    return this.decisionsService.getSummary(auditId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.decisionsService.findOne(id);
  }

  @Get('group/:groupId/history')
  async getHistory(@Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.decisionsService.getHistory(groupId);
  }

  @Post()
  async create(
    @Body() dto: CreateDecisionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionsService.create(dto, userId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDecisionDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionsService.update(id, dto, userId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionsService.approve(id, userId);
  }

  @Post('bulk-approve')
  @HttpCode(HttpStatus.OK)
  async bulkApprove(
    @Body() body: { ids: string[] },
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionsService.bulkApprove(body.ids, userId);
  }

  @Post(':id/rollback')
  @HttpCode(HttpStatus.OK)
  async rollback(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionsService.rollback(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionsService.delete(id, userId);
  }
}
