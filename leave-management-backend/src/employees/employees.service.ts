import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { LeaveCalculationService } from '../leaves/services/leave-calculation.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { LeaveRequest } from '../leaves/entities/leave-request.entity';
import { LeaveBalance } from '../leaves/entities/leave-balance.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private leaveCalculationService: LeaveCalculationService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    // Check if email already exists in employees
    const existingEmployee = await this.employeeRepository.findOne({
      where: { email: createEmployeeDto.email }
    });
    if (existingEmployee) {
      throw new ConflictException('Email already exists');
    }

    // Check if email already exists in users
    const existingUser = await this.userRepository.findOne({
      where: { email: createEmployeeDto.email }
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Check if employeeId already exists
    if (createEmployeeDto.employeeId) {
      const existingEmployeeId = await this.employeeRepository.findOne({
        where: { employeeId: createEmployeeDto.employeeId }
      });
      if (existingEmployeeId) {
        throw new ConflictException('Employee ID already exists');
      }
    }

    // Create user record without password (they'll set it via invite)
    const user = this.userRepository.create({
      email: createEmployeeDto.email,
      passwordHash: '', // Empty password hash - they'll set it via invite
      role: UserRole.EMPLOYEE,
      isActive: true,
      mustChangePassword: false,
    });
    const savedUser = await this.userRepository.save(user);

    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      userId: savedUser.id,
      joiningDate: new Date(createEmployeeDto.joiningDate),
      probationEndDate: createEmployeeDto.probationEndDate 
        ? new Date(createEmployeeDto.probationEndDate) 
        : null,
    });

    const savedEmployee = await this.employeeRepository.save(employee);

    // Initialize leave balances for the new employee
    const manualBalances = createEmployeeDto.useManualBalances && createEmployeeDto.manualBalances
      ? createEmployeeDto.manualBalances
      : undefined;
      
    await this.leaveCalculationService.initializeLeaveBalances(
      savedEmployee.id,
      savedEmployee.joiningDate,
      manualBalances,
    );

    return savedEmployee;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
  }): Promise<{ employees: Employee[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const offset = (page - 1) * limit;

    const queryBuilder = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.manager', 'manager');

    // Add search filter
    if (options?.search) {
      queryBuilder.where(
        '(employee.firstName ILIKE :search OR employee.lastName ILIKE :search OR employee.employeeId ILIKE :search)',
        { search: `%${options.search}%` }
      );
    }

    // Add department filter
    if (options?.departmentId) {
      queryBuilder.andWhere('employee.departmentId = :departmentId', {
        departmentId: options.departmentId,
      });
    }

    const [employees, total] = await queryBuilder
      .orderBy('employee.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { employees, total, page, limit };
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['user', 'department', 'manager', 'subordinates', 'leaveBalances'],
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async findByEmployeeId(employeeId: string): Promise<Employee | null> {
    return this.employeeRepository.findOne({
      where: { employeeId },
      relations: ['user', 'department', 'manager'],
    });
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    return this.employeeRepository.findOne({
      where: { userId },
      relations: ['user', 'department', 'manager', 'leaveBalances'],
    });
  }

  async findSubordinates(managerId: string): Promise<Employee[]> {
    return this.employeeRepository.find({
      where: { managerId },
      relations: ['user', 'department'],
    });
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    console.log('=== EMPLOYEE UPDATE START ===');
    console.log('Employee ID:', id);
    console.log('Update DTO:', JSON.stringify(updateEmployeeDto, null, 2));

    const employee = await this.findOne(id);
    console.log('Current employee before update:', JSON.stringify({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      departmentId: employee.departmentId,
      position: employee.position,
      managerId: employee.managerId,
    }, null, 2));

    // Check if email is being changed and already exists
    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const existingEmployee = await this.employeeRepository.findOne({
        where: { email: updateEmployeeDto.email }
      });
      if (existingEmployee) {
        throw new ConflictException('Email already exists');
      }
    }

    // Check if employeeId is being changed and already exists
    if (updateEmployeeDto.employeeId && updateEmployeeDto.employeeId !== employee.employeeId) {
      const existingEmployeeId = await this.employeeRepository.findOne({
        where: { employeeId: updateEmployeeDto.employeeId }
      });
      if (existingEmployeeId) {
        throw new ConflictException('Employee ID already exists');
      }
    }

    // Explicitly set each field to ensure TypeORM detects changes
    if (updateEmployeeDto.employeeId !== undefined) {
      employee.employeeId = updateEmployeeDto.employeeId;
    }
    if (updateEmployeeDto.firstName !== undefined) {
      employee.firstName = updateEmployeeDto.firstName;
    }
    if (updateEmployeeDto.lastName !== undefined) {
      employee.lastName = updateEmployeeDto.lastName;
    }
    if (updateEmployeeDto.phone !== undefined) {
      employee.phone = updateEmployeeDto.phone;
    }
    if (updateEmployeeDto.departmentId !== undefined) {
      employee.departmentId = updateEmployeeDto.departmentId;
    }
    if (updateEmployeeDto.position !== undefined) {
      employee.position = updateEmployeeDto.position;
    }
    if (updateEmployeeDto.managerId !== undefined) {
      employee.managerId = updateEmployeeDto.managerId;
    }
    if (updateEmployeeDto.joiningDate !== undefined) {
      employee.joiningDate = new Date(updateEmployeeDto.joiningDate);
    }
    if (updateEmployeeDto.probationEndDate !== undefined) {
      employee.probationEndDate = updateEmployeeDto.probationEndDate 
        ? new Date(updateEmployeeDto.probationEndDate) 
        : null;
    }
    if (updateEmployeeDto.annualLeaveDays !== undefined) {
      employee.annualLeaveDays = updateEmployeeDto.annualLeaveDays;
    }
    if (updateEmployeeDto.sickLeaveDays !== undefined) {
      employee.sickLeaveDays = updateEmployeeDto.sickLeaveDays;
    }
    if (updateEmployeeDto.casualLeaveDays !== undefined) {
      employee.casualLeaveDays = updateEmployeeDto.casualLeaveDays;
    }
    if (updateEmployeeDto.email !== undefined) {
      employee.email = updateEmployeeDto.email;
    }

    console.log('Employee after manual assignment:', JSON.stringify({
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      departmentId: employee.departmentId,
      position: employee.position,
      managerId: employee.managerId,
    }, null, 2));

    // Use repository update method for more direct database update
    const updateData: Partial<Employee> = {};
    
    if (updateEmployeeDto.employeeId !== undefined) updateData.employeeId = updateEmployeeDto.employeeId;
    if (updateEmployeeDto.firstName !== undefined) updateData.firstName = updateEmployeeDto.firstName;
    if (updateEmployeeDto.lastName !== undefined) updateData.lastName = updateEmployeeDto.lastName;
    if (updateEmployeeDto.phone !== undefined) updateData.phone = updateEmployeeDto.phone;
    if (updateEmployeeDto.departmentId !== undefined) updateData.departmentId = updateEmployeeDto.departmentId;
    if (updateEmployeeDto.position !== undefined) updateData.position = updateEmployeeDto.position;
    if (updateEmployeeDto.managerId !== undefined) updateData.managerId = updateEmployeeDto.managerId;
    if (updateEmployeeDto.joiningDate !== undefined) updateData.joiningDate = new Date(updateEmployeeDto.joiningDate);
    if (updateEmployeeDto.probationEndDate !== undefined) {
      updateData.probationEndDate = updateEmployeeDto.probationEndDate ? new Date(updateEmployeeDto.probationEndDate) : null;
    }
    if (updateEmployeeDto.annualLeaveDays !== undefined) updateData.annualLeaveDays = updateEmployeeDto.annualLeaveDays;
    if (updateEmployeeDto.sickLeaveDays !== undefined) updateData.sickLeaveDays = updateEmployeeDto.sickLeaveDays;
    if (updateEmployeeDto.casualLeaveDays !== undefined) updateData.casualLeaveDays = updateEmployeeDto.casualLeaveDays;
    if (updateEmployeeDto.email !== undefined) updateData.email = updateEmployeeDto.email;

    console.log('Direct update data:', JSON.stringify(updateData, null, 2));

    // Perform direct repository update
    await this.employeeRepository.update(id, updateData);

    // Fetch and return updated employee
    const savedEmployee = await this.findOne(id);
    console.log('Employee after update:', JSON.stringify({
      id: savedEmployee.id,
      firstName: savedEmployee.firstName,
      lastName: savedEmployee.lastName,
      departmentId: savedEmployee.departmentId,
      position: savedEmployee.position,
      managerId: savedEmployee.managerId,
    }, null, 2));
    console.log('=== EMPLOYEE UPDATE END ===');

    return savedEmployee;
  }

  async remove(id: string): Promise<void> {
    // Start a transaction to ensure all deletions happen atomically
    await this.employeeRepository.manager.transaction(async (manager) => {
      // First, find the employee to get their user ID
      const employee = await manager.findOne(Employee, { 
        where: { id },
        relations: ['user']
      });
      
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      console.log(`Starting cascading delete for employee: ${employee.firstName} ${employee.lastName} (ID: ${id})`);

      // Step 1: Remove this employee as manager from any departments
      await manager.query(
        `UPDATE departments SET manager_id = NULL WHERE manager_id = $1`,
        [id]
      );
      console.log('Updated departments to remove as manager');

      // Step 2: Remove this employee as manager from any subordinate employees  
      await manager.query(
        `UPDATE employees SET manager_id = NULL WHERE manager_id = $1`,
        [id]
      );
      console.log('Updated subordinate employees to remove as manager');

      // Step 3: Delete leave requests (should cascade but doing explicitly for clarity)
      const deletedRequests = await manager.delete(LeaveRequest, { employeeId: id });
      console.log(`Deleted ${deletedRequests.affected || 0} leave requests`);

      // Step 4: Delete leave balances (should cascade but doing explicitly for clarity)  
      const deletedBalances = await manager.delete(LeaveBalance, { employeeId: id });
      console.log(`Deleted ${deletedBalances.affected || 0} leave balances`);

      // Step 5: Delete the employee record
      const deletedEmployee = await manager.delete(Employee, { id });
      console.log(`Deleted employee record: ${deletedEmployee.affected || 0}`);

      // Step 6: Delete the associated user account (should cascade but doing explicitly)
      if (employee.user) {
        // This will also cascade delete any password_reset_tokens
        const deletedUser = await manager.delete(User, { id: employee.user.id });
        console.log(`Deleted user account: ${deletedUser.affected || 0}`);
      }

      console.log('Cascading delete completed successfully');
    });
  }

  async getEmployeeStats(): Promise<{
    total: number;
    active: number;
    onProbation: number;
    byDepartment: { department: string; count: number }[];
  }> {
    const total = await this.employeeRepository.count();
    
    const activeEmployees = await this.employeeRepository.count({
      where: { user: { isActive: true } },
      relations: ['user'],
    });

    const onProbation = await this.employeeRepository.count({
      where: { probationEndDate: new Date() > new Date() ? undefined : new Date() },
    });

    const byDepartmentQuery = await this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoin('employee.department', 'department')
      .select('department.name', 'department')
      .addSelect('COUNT(employee.id)', 'count')
      .groupBy('department.name')
      .getRawMany();

    return {
      total,
      active: activeEmployees,
      onProbation,
      byDepartment: byDepartmentQuery.map(item => ({
        department: item.department || 'No Department',
        count: parseInt(item.count),
      })),
    };
  }
}