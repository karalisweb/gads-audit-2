import { IsString, IsOptional, IsArray, IsUUID, MaxLength } from 'class-validator';

export class UpdateChangeSetDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  decisionIds?: string[];
}
