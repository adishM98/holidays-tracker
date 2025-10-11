import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsNumber,
  IsUUID,
  IsBoolean,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class ManualBalancesDto {
  @ApiPropertyOptional({
    example: 15.5,
    description: "Current earned/privilege leave balance",
  })
  @IsOptional()
  @IsNumber()
  earned?: number;

  @ApiPropertyOptional({
    example: 8,
    description: "Current sick leave balance",
  })
  @IsOptional()
  @IsNumber()
  sick?: number;

  @ApiPropertyOptional({
    example: 4,
    description: "Current casual leave balance",
  })
  @IsOptional()
  @IsNumber()
  casual?: number;
}

export class CreateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ example: "EMP001" })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: "john.doe@company.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "John" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: "Software Engineer" })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiProperty({ example: "2023-01-15" })
  @IsDateString()
  joiningDate: string;

  @ApiPropertyOptional({ example: "2023-04-15" })
  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  @ApiPropertyOptional({ example: 21, default: 21 })
  @IsOptional()
  @IsNumber()
  annualLeaveDays?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsNumber()
  sickLeaveDays?: number;

  @ApiPropertyOptional({ example: 6, default: 6 })
  @IsOptional()
  @IsNumber()
  casualLeaveDays?: number;

  @ApiPropertyOptional({
    description:
      "Whether to use manual balance overrides for existing employees",
  })
  @IsOptional()
  @IsBoolean()
  useManualBalances?: boolean;

  @ApiPropertyOptional({
    description: "Manual balances for existing employees",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualBalancesDto)
  manualBalances?: ManualBalancesDto;
}
