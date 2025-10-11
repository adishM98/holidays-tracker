import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Employee } from "../../employees/entities/employee.entity";

@Entity("departments")
export class Department {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: "manager_id", nullable: true })
  managerId: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: "manager_id" })
  manager: Employee;

  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
