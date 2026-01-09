import { IsString, IsOptional, IsUUID, IsNotEmpty, IsArray, MaxLength } from 'class-validator';

export class CreateChangeSetDto {
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  decisionIds?: string[];
}
