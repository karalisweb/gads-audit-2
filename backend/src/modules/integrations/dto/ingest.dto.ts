import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IngestMetadataDto {
  @IsString()
  runId: string;

  @IsString()
  datasetName: string;

  @IsNumber()
  @Min(0)
  chunkIndex: number;

  @IsNumber()
  @Min(1)
  chunkTotal: number;

  @IsNumber()
  @Min(0)
  rowCount: number;

  @IsOptional()
  @IsNumber()
  datasetsExpected?: number;

  @IsOptional()
  @IsString()
  dateRangeStart?: string;

  @IsOptional()
  @IsString()
  dateRangeEnd?: string;
}

export class IngestDto {
  @ValidateNested()
  @Type(() => IngestMetadataDto)
  metadata: IngestMetadataDto;

  @IsArray()
  @IsObject({ each: true })
  data: Record<string, unknown>[];
}

// Dataset types that we support
export type DatasetName =
  | 'campaigns'
  | 'ad_groups'
  | 'ads'
  | 'keywords'
  | 'search_terms'
  | 'negative_keywords'
  | 'assets'
  | 'conversion_actions'
  | 'geo_performance'
  | 'device_performance';

export const VALID_DATASETS: DatasetName[] = [
  'campaigns',
  'ad_groups',
  'ads',
  'keywords',
  'search_terms',
  'negative_keywords',
  'assets',
  'conversion_actions',
  'geo_performance',
  'device_performance',
];
