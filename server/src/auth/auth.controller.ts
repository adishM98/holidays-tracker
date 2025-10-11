import {
  Controller,
  Post,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { CompleteInviteDto } from "./dto/complete-invite.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";

@ApiTags("Authentication")
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "User login" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, description: "Token refreshed" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refresh(@Body("refresh_token") refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Put("change-password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change password" })
  @ApiResponse({ status: 200, description: "Password changed successfully" })
  @ApiResponse({ status: 400, description: "Invalid current password" })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset" })
  @ApiResponse({
    status: 200,
    description: "Reset email sent if account exists",
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with token" })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post("complete-invite")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete user invitation and set password" })
  @ApiResponse({ status: 200, description: "Account activated successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async completeInvite(@Body() completeInviteDto: CompleteInviteDto) {
    return this.authService.completeInvite(completeInviteDto);
  }
}
