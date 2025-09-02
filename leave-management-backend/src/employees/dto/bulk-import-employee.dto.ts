import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
} from "class-validator";

export class BulkImportEmployeeDto {
  @IsNotEmpty()
  employeeId: string;

  @IsNotEmpty()
  firstName: string;

  @IsOptional()
  lastName?: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  department: string; // Department name, will be mapped to department ID

  @IsOptional()
  position?: string;

  @IsOptional()
  manager?: string; // Manager employee ID or email, will be resolved

  @IsDateString()
  joiningDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  earnedBalance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sickBalance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  casualBalance?: number;
}

export class BulkImportResultDto {
  success: boolean;
  message: string;
  summary: {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    errors: Array<{
      row: number;
      employeeId: string;
      email: string;
      errors: string[];
    }>;
  };
}

export class BulkImportReportDto {
  row: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "success" | "error";
  errors: string[];
}
