import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ModificationStatus,
  ModificationEntityType,
  ModificationType,
} from '../../../entities/modification.entity';

export class ModificationFiltersDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsEnum(ModificationEntityType)
  entityType?: ModificationEntityType;

  @IsOptional()
  @IsEnum(ModificationType)
  modificationType?: ModificationType;

  @IsOptional()
  @IsEnum(ModificationStatus)
  status?: ModificationStatus;
}
