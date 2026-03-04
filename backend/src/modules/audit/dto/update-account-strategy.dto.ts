import { IsOptional, IsIn, IsString, MaxLength } from 'class-validator';

export class UpdateAccountStrategyDto {
  @IsOptional()
  @IsIn(['hotel', 'ecommerce', 'services', 'lead_gen', 'local_business', 'other'], {
    message: 'businessType must be one of: hotel, ecommerce, services, lead_gen, local_business, other',
  })
  businessType?: string;

  @IsOptional()
  @IsIn(['brand_awareness', 'leads', 'conversions', 'traffic', 'calls'], {
    message: 'primaryObjective must be one of: brand_awareness, leads, conversions, traffic, calls',
  })
  primaryObjective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  strategyNotes?: string;
}
