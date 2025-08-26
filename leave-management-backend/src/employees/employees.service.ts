import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { LeaveCalculationService } from '../leaves/services/leave-calculation.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private leaveCalculationService: LeaveCalculationService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    // Check if email already exists
    const existingEmployee = await this.employeeRepository.findOne({
      where: { email: createEmployeeDto.email }
    });
    if (existingEmployee) {
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

    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      joiningDate: new Date(createEmployeeDto.joiningDate),
      probationEndDate: createEmployeeDto.probationEndDate 
        ? new Date(createEmployeeDto.probationEndDate) 
        : null,
    });

    const savedEmployee = await this.employeeRepository.save(employee);

    // Initialize leave balances for the new employee
    await this.leaveCalculationService.initializeLeaveBalances(
      savedEmployee.id,
      savedEmployee.joiningDate,
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
    const result = await this.employeeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Employee not found');
    }
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