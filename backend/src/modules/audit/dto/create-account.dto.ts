import { IsString, IsOptional, Matches, Length } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @Matches(/^\d{3}-\d{3}-\d{4}$/, {
    message: 'Customer ID must be in format XXX-XXX-XXXX (e.g., 816-496-5072)',
  })
  customerId: string;

  @IsString()
  @Length(1, 255)
  customerName: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currencyCode?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;
}
