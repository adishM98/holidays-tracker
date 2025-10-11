import { IsEnum, IsDateString, IsOptional, IsString, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LeaveType } from "../../common/enums/leave-type.enum";

export class CreateLeaveRequestDto {
  @ApiProperty({ enum: LeaveType, example: LeaveType.SICK })
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @ApiProperty({ example: "2024-03-15" })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: "2024-03-20" })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: "Family vacation" })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ 
    example: false, 
    description: "Whether this is a half-day leave request",
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  isHalfDay?: boolean;
}
