import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, IsNull } from "typeorm";
import { Department } from "./entities/department.entity";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
    // Check if department name already exists
    const existingDepartment = await this.departmentRepository.findOne({
      where: { name: createDepartmentDto.name },
    });

    if (existingDepartment) {
      throw new ConflictException("Department name already exists");
    }

    const department = this.departmentRepository.create(createDepartmentDto);
    return this.departmentRepository.save(department);
  }

  async findAll(): Promise<Department[]> {
    return this.departmentRepository.find({
      relations: ["manager", "employees"],
      order: { name: "ASC" },
    });
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ["manager", "employees"],
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    return department;
  }

  async findByName(name: string): Promise<Department | null> {
    return this.departmentRepository.findOne({
      where: { name },
      relations: ["manager", "employees"],
    });
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<Department> {
    const department = await this.findOne(id);

    // Check if department name is being changed and already exists
    if (
      updateDepartmentDto.name &&
      updateDepartmentDto.name !== department.name
    ) {
      const existingDepartment = await this.findByName(
        updateDepartmentDto.name,
      );
      if (existingDepartment) {
        throw new ConflictException("Department name already exists");
      }
    }

    Object.assign(department, updateDepartmentDto);
    return this.departmentRepository.save(department);
  }

  async remove(id: string): Promise<void> {
    const department = await this.findOne(id);

    // Check if department has employees
    if (department.employees && department.employees.length > 0) {
      throw new ConflictException(
        "Cannot delete department with existing employees",
      );
    }

    const result = await this.departmentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException("Department not found");
    }
  }

  async getDepartmentStats(): Promise<{
    total: number;
    withManagers: number;
    employeeDistribution: { department: string; count: number }[];
  }> {
    const total = await this.departmentRepository.count();

    const withManagers = await this.departmentRepository.count({
      where: { managerId: Not(IsNull()) },
    });

    const employeeDistribution = await this.departmentRepository
      .createQueryBuilder("department")
      .leftJoin("department.employees", "employee")
      .select("department.name", "department")
      .addSelect("COUNT(employee.id)", "count")
      .groupBy("department.id, department.name")
      .orderBy("COUNT(employee.id)", "DESC")
      .getRawMany();

    return {
      total,
      withManagers,
      employeeDistribution: employeeDistribution.map((item) => ({
        department: item.department,
        count: parseInt(item.count),
      })),
    };
  }
}
