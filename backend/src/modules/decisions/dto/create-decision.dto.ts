import { IsString, IsNumber, IsOptional, IsObject, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateDecisionDto {
  @IsUUID()
  @IsNotEmpty()
  auditId: string;

  @IsNumber()
  moduleId: number;

  @IsString()
  @MaxLength(30)
  entityType: string;

  @IsString()
  @MaxLength(50)
  entityId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  entityName?: string;

  @IsString()
  @MaxLength(50)
  actionType: string;

  @IsObject()
  @IsOptional()
  beforeValue?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  afterValue?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  rationale?: string;

  @IsObject()
  @IsOptional()
  evidence?: Record<string, unknown>;
}
