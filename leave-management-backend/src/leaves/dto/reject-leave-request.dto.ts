import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectLeaveRequestDto {
  @ApiProperty({ example: 'Not enough staff coverage during this period' })
  @IsString()
  rejectionReason: string;
}