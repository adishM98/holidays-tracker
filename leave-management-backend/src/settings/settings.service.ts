import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/system-setting.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SettingsService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'logo');
  private readonly faviconDir = path.join(process.cwd(), 'uploads', 'favicon');

  constructor(
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
  ) {
    // Ensure upload directories exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(this.faviconDir)) {
      fs.mkdirSync(this.faviconDir, { recursive: true });
    }
  }

  async getSetting(key: string): Promise<SystemSetting> {
    const setting = await this.systemSettingRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    return setting;
  }

  async getSettingOrDefault(key: string, defaultValue: string = ''): Promise<string> {
    try {
      const setting = await this.getSetting(key);
      return setting.value;
    } catch (error) {
      return defaultValue;
    }
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return this.systemSettingRepository.find();
  }

  async updateSetting(key: string, value: string): Promise<SystemSetting> {
    let setting = await this.systemSettingRepository.findOne({
      where: { key },
    });

    if (!setting) {
      // Create new setting if it doesn't exist
      setting = this.systemSettingRepository.create({ key, value });
    } else {
      setting.value = value;
    }

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

  async uploadLogo(file: Express.Multer.File): Promise<{ url: string; metadata: any }> {
    // Delete old logo if exists
    const oldLogoPath = await this.getSettingOrDefault('company_logo_path');
    if (oldLogoPath) {
      const fullOldPath = path.join(process.cwd(), oldLogoPath);
      if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
      }
    }

    // Save new logo
    const filename = `logo-${Date.now()}${path.extname(file.originalname)}`;
    const filepath = path.join(this.uploadDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    const relativePath = path.join('uploads', 'logo', filename);
    const url = `/${relativePath.replace(/\\/g, '/')}`;

    // Store metadata
    const metadata = {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    await this.updateSetting('company_logo_path', relativePath);
    await this.updateSetting('company_logo_metadata', JSON.stringify(metadata));

    return { url, metadata };
  }

  async getLogoUrl(): Promise<string | null> {
    try {
      const logoPath = await this.getSettingOrDefault('company_logo_path');
      if (!logoPath) return null;

      const fullPath = path.join(process.cwd(), logoPath);
      if (!fs.existsSync(fullPath)) return null;

      return `/${logoPath.replace(/\\/g, '/')}?v=${Date.now()}`;
    } catch (error) {
      return null;
    }
  }

  async deleteLogo(): Promise<void> {
    const logoPath = await this.getSettingOrDefault('company_logo_path');
    if (logoPath) {
      const fullPath = path.join(process.cwd(), logoPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await this.updateSetting('company_logo_path', '');
    await this.updateSetting('company_logo_metadata', '');
  }

  // Favicon Management
  async uploadFavicon(file: Express.Multer.File): Promise<{ url: string; metadata: any }> {
    // Delete old favicon if exists
    const oldFaviconPath = await this.getSettingOrDefault('company_favicon_path');
    if (oldFaviconPath) {
      const fullOldPath = path.join(process.cwd(), oldFaviconPath);
      if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
      }
    }

    // Save new favicon
    const filename = `favicon-${Date.now()}${path.extname(file.originalname)}`;
    const filepath = path.join(this.faviconDir, filename);
    fs.writeFileSync(filepath, file.buffer);

    const relativePath = path.join('uploads', 'favicon', filename);
    const url = `/${relativePath.replace(/\\/g, '/')}`;

    // Store metadata
    const metadata = {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    await this.updateSetting('company_favicon_path', relativePath);
    await this.updateSetting('company_favicon_metadata', JSON.stringify(metadata));

    return { url, metadata };
  }

  async getFaviconUrl(): Promise<string | null> {
    try {
      const faviconPath = await this.getSettingOrDefault('company_favicon_path');
      if (!faviconPath) return null;

      const fullPath = path.join(process.cwd(), faviconPath);
      if (!fs.existsSync(fullPath)) return null;

      return `/${faviconPath.replace(/\\/g, '/')}?v=${Date.now()}`;
    } catch (error) {
      return null;
    }
  }

  async deleteFavicon(): Promise<void> {
    const faviconPath = await this.getSettingOrDefault('company_favicon_path');
    if (faviconPath) {
      const fullPath = path.join(process.cwd(), faviconPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await this.updateSetting('company_favicon_path', '');
    await this.updateSetting('company_favicon_metadata', '');
  }
}
