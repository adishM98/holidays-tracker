import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { User } from "../users/entities/user.entity";
import { Employee } from "../employees/entities/employee.entity";
import { Department } from "../departments/entities/department.entity";
import { LeaveRequest } from "../leaves/entities/leave-request.entity";
import { LeaveBalance } from "../leaves/entities/leave-balance.entity";
import { PasswordResetToken } from "../auth/entities/password-reset-token.entity";
import { Holiday } from "../holidays/entities/holiday.entity";
import { SystemSetting } from "../settings/entities/system-setting.entity";
import { GoogleCalendarToken } from "../google-calendar/entities/google-calendar-token.entity";
import { DatabaseCreationService } from "./database-creation.service";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DATABASE_HOST"),
        port: configService.get("DATABASE_PORT"),
        username: configService.get("DATABASE_USERNAME"),
        password: configService.get("DATABASE_PASSWORD"),
        database: configService.get("DATABASE_NAME"),
        entities: [
          User,
          Employee,
          Department,
          LeaveRequest,
          LeaveBalance,
          PasswordResetToken,
          Holiday,
          SystemSetting,
          GoogleCalendarToken,
        ],
        synchronize: true, // Enable sync but we'll recreate admin user properly
        dropSchema: false,
        createDatabase: false,
        logging: false, // Disable excessive logging
        ssl:
          configService.get("DATABASE_SSL") === "true"
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [DatabaseCreationService],
  exports: [DatabaseCreationService],
})
export class DatabaseModule {}
