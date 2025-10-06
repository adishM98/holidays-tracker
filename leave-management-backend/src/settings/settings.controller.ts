import { Controller, Get, Put, Body, UseGuards, Param } from '@nestjs/common';
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
}
