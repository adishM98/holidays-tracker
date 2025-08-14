import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { AdminController } from './admin.controller';
import { BulkImportService } from './services/bulk-import.service';
import { User } from '../users/entities/user.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Department } from '../departments/entities/department.entity';
import { UsersModule } from '../users/users.module';
import { EmployeesModule } from '../employees/employees.module';
import { DepartmentsModule } from '../departments/departments.module';
import { LeavesModule } from '../leaves/leaves.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Employee, Department]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
    UsersModule,
    EmployeesModule,
    DepartmentsModule,
    LeavesModule,
    AuthModule,
    MailModule,
  ],
  controllers: [AdminController],
  providers: [BulkImportService],
})
export class AdminModule {}