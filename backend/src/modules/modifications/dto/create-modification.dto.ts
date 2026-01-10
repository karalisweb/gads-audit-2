import {
  IsString,
  IsOptional,
  IsObject,
  IsUUID,
  IsNotEmpty,
  MaxLength,
  IsEnum,
} from 'class-validator';
import {
  ModificationEntityType,
  ModificationType,
} from '../../../entities/modification.entity';

export class CreateModificationDto {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsEnum(ModificationEntityType)
  entityType: ModificationEntityType;

  @IsString()
  @MaxLength(50)
  entityId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  entityName?: string;

  @IsEnum(ModificationType)
  modificationType: ModificationType;

  @IsObject()
  @IsOptional()
  beforeValue?: Record<string, unknown>;

  @IsObject()
  @IsNotEmpty()
  afterValue: Record<string, unknown>;

  @IsString()
  @IsOptional()
  notes?: string;
}
