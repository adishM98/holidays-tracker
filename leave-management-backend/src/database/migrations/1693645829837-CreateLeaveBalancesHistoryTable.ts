import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLeaveBalancesHistoryTable1693645829837 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS leave_balances_history (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID NOT NULL,
                year INT NOT NULL,
                leave_type VARCHAR(50) NOT NULL,
                total_allocated DECIMAL(5,2) NOT NULL,
                used_days DECIMAL(5,2) NOT NULL,
                available_days DECIMAL(5,2) NOT NULL,
                carry_forward DECIMAL(5,2) DEFAULT 0,
                archived_at TIMESTAMP DEFAULT NOW(),
                archived_by UUID NULL,
                CONSTRAINT fk_leave_balances_history_employee
                    FOREIGN KEY (employee_id)
                    REFERENCES employees (id) 
                    ON DELETE CASCADE,
                CONSTRAINT fk_leave_balances_history_user
                    FOREIGN KEY (archived_by)
                    REFERENCES users (id) 
                    ON DELETE SET NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_leave_balances_history_employee_id ON leave_balances_history (employee_id);
            CREATE INDEX IF NOT EXISTS idx_leave_balances_history_year ON leave_balances_history (year);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS leave_balances_history;
        `);
    }
}
