import { IsString, MinLength, Matches, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({
    required: false,
    description: "Current password (optional for employees)",
  })
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
  })
  newPassword: string;
}
