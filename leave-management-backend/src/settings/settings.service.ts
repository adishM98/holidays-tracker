import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
  ) {}

  async getSetting(key: string): Promise<SystemSetting> {
    const setting = await this.systemSettingRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    return setting;
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return this.systemSettingRepository.find();
  }

  async updateSetting(key: string, value: string): Promise<SystemSetting> {
    const setting = await this.getSetting(key);
    setting.value = value;
    return this.systemSettingRepository.save(setting);
  }

  async getAutoApproveEnabled(): Promise<boolean> {
    try {
      const setting = await this.getSetting('auto_approve_pending_leaves');
      return setting.value === 'true';
    } catch (error) {
      // Default to false if setting doesn't exist
      return false;
    }
  }

  async setAutoApproveEnabled(enabled: boolean): Promise<SystemSetting> {
    return this.updateSetting('auto_approve_pending_leaves', enabled.toString());
  }
}
