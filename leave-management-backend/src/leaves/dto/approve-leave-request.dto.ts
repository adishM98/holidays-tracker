import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveLeaveRequestDto {
  @ApiPropertyOptional({ example: 'Approved for vacation' })
  @IsOptional()
  @IsString()
  comments?: string;
}