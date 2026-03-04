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
  | 'device_performance'
  | 'daily_campaigns'
  | 'daily_ad_groups'
  | 'daily_keywords'
  | 'daily_ads'
  | 'daily_search_terms';

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
  'daily_campaigns',
  'daily_ad_groups',
  'daily_keywords',
  'daily_ads',
  'daily_search_terms',
];

// Mapping from daily dataset names to entity types
export const DAILY_DATASET_ENTITY_MAP: Record<string, string> = {
  daily_campaigns: 'campaign',
  daily_ad_groups: 'ad_group',
  daily_keywords: 'keyword',
  daily_ads: 'ad',
  daily_search_terms: 'search_term',
};
