import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  ModificationStatus,
  ModificationKind,
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

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsEnum(ModificationKind)
  kind?: ModificationKind;

  // Se true, nasconde le modifiche il cui target (campagna/gruppo/annuncio/keyword)
  // è in pausa o rimosso (incl. genitore spento).
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  activeOnly?: boolean;

  // Se true, mostra solo le modifiche "da lavorare" (pending/approved/processing),
  // nascondendo quelle già concluse (applied/failed/rejected/cancelled).
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  actionableOnly?: boolean;
}
