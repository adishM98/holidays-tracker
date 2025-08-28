import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { LeavesModule } from './leaves/leaves.module';
import { MailModule } from './mail/mail.module';
import { HolidaysModule } from './holidays/holidays.module';
import { AdminModule } from './admin/admin.module';
import { ManagerModule } from './manager/manager.module';
import { EmployeeModule } from './employee/employee.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL) || 60000,
        limit: parseInt(process.env.THROTTLE_LIMIT) || 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    DepartmentsModule,
    LeavesModule,
    MailModule,
    HolidaysModule,
    AdminModule,
    ManagerModule,
    EmployeeModule,
  ],
})
export class AppModule {}