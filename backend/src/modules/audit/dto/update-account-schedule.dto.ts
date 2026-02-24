import { IsBoolean, IsOptional, IsArray, IsInt, IsIn, Min, Max, Matches, ArrayMaxSize } from 'class-validator';

export class UpdateAccountScheduleDto {
  @IsOptional()
  @IsBoolean()
  scheduleEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  @ArrayMaxSize(7)
  scheduleDays?: number[];

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Time must be in HH:mm format' })
  scheduleTime?: string;

  @IsOptional()
  @IsIn(['weekly', 'biweekly', 'monthly'], { message: 'Frequency must be weekly, biweekly, or monthly' })
  scheduleFrequency?: string;
}
