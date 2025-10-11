import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "john.doe@company.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "password123" })
  @IsString()
  @MinLength(6)
  password: string;
}
