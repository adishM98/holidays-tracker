import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { UsersService } from "../users/users.service";
import { MailService } from "../mail/mail.service";
import { User } from "../users/entities/user.entity";
import { PasswordResetToken } from "./entities/password-reset-token.entity";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { CompleteInviteDto } from "./dto/complete-invite.dto";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: "30d" });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      return {
        access_token: this.jwtService.sign(newPayload),
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Skip current password validation entirely for all users (direct password reset)
    // This allows users to reset their password without needing to remember the current one

    this.validatePasswordStrength(changePasswordDto.newPassword);

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);

    // If user was forced to change password, remove the flag
    if (user.mustChangePassword) {
      await this.usersService.update(userId, { mustChangePassword: false });
    }

    return { message: "Password changed successfully" };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    if (!user) {
      // Don't reveal if email exists or not
      return { message: "If the email exists, a reset link has been sent" };
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await this.passwordResetTokenRepository.save({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send email
    await this.mailService.sendPasswordResetEmail(user.email, token);

    return { message: "If the email exists, a reset link has been sent" };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token: resetPasswordDto.token },
      relations: ["user"],
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    this.validatePasswordStrength(resetPasswordDto.newPassword);

    // Update password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.usersService.updatePassword(resetToken.userId, hashedPassword);

    // Mark token as used
    await this.passwordResetTokenRepository.update(resetToken.id, {
      used: true,
    });

    return { message: "Password reset successfully" };
  }

  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new BadRequestException(
        "Password must be at least 8 characters long",
      );
    }

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new BadRequestException(
        "Password must contain uppercase, lowercase, number and special character",
      );
    }
  }

  generateSecurePassword(): string {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async completeInvite(
    completeInviteDto: CompleteInviteDto,
  ): Promise<{ message: string; access_token: string; refresh_token: string; user: any }> {
    const { email, token, password } = completeInviteDto;

    try {
      // Decode the invite token
      // Convert URL-safe base64 back to standard base64
      const standardBase64 = token.replace(/-/g, "+").replace(/_/g, "/");
      // Add padding if needed
      const paddedBase64 =
        standardBase64 + "=".repeat((4 - (standardBase64.length % 4)) % 4);

      const decodedToken = Buffer.from(paddedBase64, "base64").toString(
        "utf-8",
      );
      const [employeeId, tokenEmail, timestamp] = decodedToken.split("|");

      // Validate token
      if (tokenEmail !== email) {
        throw new BadRequestException("Invalid invite token");
      }

      // Check if token is not too old (24 hours)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 24 * 60 * 60 * 1000) {
        throw new BadRequestException("Invite token has expired");
      }

      // Find user by email
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new BadRequestException("User not found");
      }

      // Check if user already has a password
      if (user.passwordHash && user.passwordHash.length > 0) {
        throw new BadRequestException("User account is already activated");
      }

      // Validate password strength
      this.validatePasswordStrength(password);

      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user's password and set them as active
      await this.userRepository.update(user.id, {
        passwordHash: hashedPassword,
        mustChangePassword: false,
        isActive: true,
        inviteStatus: "active",
      });

      // Generate authentication tokens for the user
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, { expiresIn: "30d" });

      return {
        message: "Account activated successfully",
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          mustChangePassword: false,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Invalid invite token");
    }
  }
}
