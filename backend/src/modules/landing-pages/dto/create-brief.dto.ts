import { IsUUID, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateBriefDto {
  @IsUUID()
  accountId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  primaryKeyword?: string;

  @IsOptional()
  @IsArray()
  keywordCluster?: {
    keywordText: string;
    keywordId?: string;
    impressions?: number;
    clicks?: number;
    cost?: number;
    conversions?: number;
    qualityScore?: number;
    matchType?: string;
  }[];
}
