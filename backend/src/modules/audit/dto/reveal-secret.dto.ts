import { IsString, MinLength } from 'class-validator';

export class RevealSecretDto {
  @IsString()
  @MinLength(1)
  password: string;
}
