import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LandingPagesService } from './landing-pages.service';
import { CreateBriefDto, UpdateBriefDto } from './dto';

@Controller('landing-pages')
export class LandingPagesController {
  constructor(private readonly landingPagesService: LandingPagesService) {}

  @Get('account/:accountId')
  async listBriefs(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.landingPagesService.listBriefs(accountId);
  }

  @Get(':id')
  async getBrief(@Param('id', ParseUUIDPipe) id: string) {
    return this.landingPagesService.getBrief(id);
  }

  @Post('cluster')
  async generateClusters(@Body('accountId') accountId: string) {
    return this.landingPagesService.generateClusters(accountId);
  }

  @Post()
  async createBrief(@Body() body: CreateBriefDto) {
    return this.landingPagesService.createBrief(body);
  }

  @Post(':id/scrape')
  async scrapeSourceUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.landingPagesService.scrapeSourceUrl(id);
  }

  @Post(':id/generate-brief')
  async generateBrief(@Param('id', ParseUUIDPipe) id: string) {
    return this.landingPagesService.generateBrief(id);
  }

  @Patch(':id')
  async updateBrief(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBriefDto,
  ) {
    return this.landingPagesService.updateBrief(id, body);
  }

  @Delete(':id')
  async deleteBrief(@Param('id', ParseUUIDPipe) id: string) {
    await this.landingPagesService.deleteBrief(id);
    return { success: true };
  }
}
