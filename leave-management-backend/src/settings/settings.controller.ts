import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  UseGuards,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { SystemSetting } from './entities/system-setting.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getAllSettings(): Promise<SystemSetting[]> {
    return this.settingsService.getAllSettings();
  }

  @Get(':key')
  @Roles(UserRole.ADMIN)
  async getSetting(@Param('key') key: string): Promise<SystemSetting> {
    return this.settingsService.getSetting(key);
  }

  @Put(':key')
  @Roles(UserRole.ADMIN)
  async updateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
  ): Promise<SystemSetting> {
    return this.settingsService.updateSetting(key, value);
  }

  @Get('auto-approve/status')
  @Roles(UserRole.ADMIN)
  async getAutoApproveStatus(): Promise<{ enabled: boolean }> {
    const enabled = await this.settingsService.getAutoApproveEnabled();
    return { enabled };
  }

  @Put('auto-approve/toggle')
  @Roles(UserRole.ADMIN)
  async toggleAutoApprove(
    @Body('enabled') enabled: boolean,
  ): Promise<{ enabled: boolean; setting: SystemSetting }> {
    const setting = await this.settingsService.setAutoApproveEnabled(enabled);
    return {
      enabled: setting.value === 'true',
      setting,
    };
  }

  // Logo Management Endpoints
  @Post('logo/upload')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string; metadata: any }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PNG, JPG, and SVG are allowed',
      );
    }

    // Validate file size (1MB max)
    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 1MB limit');
    }

    return this.settingsService.uploadLogo(file);
  }

  @Get('logo/url')
  async getLogoUrl(): Promise<{ url: string | null }> {
    const url = await this.settingsService.getLogoUrl();
    return { url };
  }

  @Delete('logo')
  @Roles(UserRole.ADMIN)
  async deleteLogo(): Promise<{ message: string }> {
    await this.settingsService.deleteLogo();
    return { message: 'Logo deleted successfully' };
  }

  // Favicon Management Endpoints
  @Post('favicon/upload')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('favicon'))
  async uploadFavicon(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string; metadata: any }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type - favicons can be ICO, PNG, or SVG
    const allowedMimeTypes = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only ICO, PNG, and SVG are allowed for favicon',
      );
    }

    // Validate file size (500KB max for favicon)
    const maxSize = 500 * 1024; // 500KB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 500KB limit');
    }

    return this.settingsService.uploadFavicon(file);
  }

  @Get('favicon/url')
  async getFaviconUrl(): Promise<{ url: string | null }> {
    const url = await this.settingsService.getFaviconUrl();
    return { url };
  }

  @Delete('favicon')
  @Roles(UserRole.ADMIN)
  async deleteFavicon(): Promise<{ message: string }> {
    await this.settingsService.deleteFavicon();
    return { message: 'Favicon deleted successfully' };
  }
}
