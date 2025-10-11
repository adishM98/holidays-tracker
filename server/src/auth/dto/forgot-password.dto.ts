import { IsEmail } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ForgotPasswordDto {
  @ApiProperty({ example: "john.doe@company.com" })
  @IsEmail()
  email: string;
}
