import { IsString, IsNotEmpty, IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum SyncMode {
  PERSONAL_ONLY = 'personal_only',
  SHARED_ONLY = 'shared_only',
  BOTH = 'both',
}

export class UpdateCalendarSettingsDto {
  @IsBoolean()
  @IsOptional()
  enableSharedCalendar?: boolean;

  @IsString()
  @IsOptional()
  sharedCalendarId?: string;

  @IsEnum(SyncMode)
  @IsOptional()
  syncMode?: SyncMode;
}

export class SharedCalendarConfigDto {
  @IsString()
  @IsNotEmpty()
  serviceAccountEmail: string;

  @IsString()
  @IsNotEmpty()
  serviceAccountKey: string;

  @IsString()
  @IsNotEmpty()
  calendarId: string;
}
