import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { CreateChangeSetDto, UpdateChangeSetDto, ChangeSetFiltersDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('account/:accountId/change-sets')
  async findAll(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filters: ChangeSetFiltersDto,
  ) {
    return this.exportService.findAll(accountId, filters);
  }

  @Get('account/:accountId/exportable-decisions')
  async getExportableDecisions(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.exportService.getExportableDecisions(accountId);
  }

  @Get('change-sets/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.exportService.findOne(id);
  }

  @Get('change-sets/:id/preview')
  async preview(@Param('id', ParseUUIDPipe) id: string) {
    return this.exportService.previewExport(id);
  }

  @Post('change-sets')
  async create(
    @Body() dto: CreateChangeSetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.exportService.create(dto, userId);
  }

  @Patch('change-sets/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChangeSetDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.exportService.update(id, dto, userId);
  }

  @Post('change-sets/:id/add-decisions')
  @HttpCode(HttpStatus.OK)
  async addDecisions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { decisionIds: string[] },
  ) {
    return this.exportService.addDecisions(id, body.decisionIds);
  }

  @Post('change-sets/:id/remove-decision')
  @HttpCode(HttpStatus.OK)
  async removeDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { decisionId: string },
  ) {
    return this.exportService.removeDecision(id, body.decisionId);
  }

  @Post('change-sets/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.exportService.approve(id, userId);
  }

  @Post('change-sets/:id/export')
  @HttpCode(HttpStatus.OK)
  async export(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.exportService.export(id, userId);
  }

  @Get('change-sets/:id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { stream, filename } = await this.exportService.download(id);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    stream.pipe(res);
  }

  @Post('change-sets/:id/mark-applied')
  @HttpCode(HttpStatus.OK)
  async markAsApplied(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.exportService.markAsApplied(id, userId);
  }

  @Delete('change-sets/:id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.exportService.delete(id, userId);
  }
}
