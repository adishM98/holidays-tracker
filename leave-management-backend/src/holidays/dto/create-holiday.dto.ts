import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHolidayDto {
  @ApiProperty({ description: 'Holiday name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Holiday date' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Holiday description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Is this a recurring holiday', default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiProperty({ description: 'Is this holiday active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}