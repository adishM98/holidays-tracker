import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsHalfDayToLeaveRequests1756973648513 implements MigrationInterface {
    name = 'AddIsHalfDayToLeaveRequests1756973648513'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if is_half_day column already exists
        const hasIsHalfDayColumn = await queryRunner.hasColumn("leave_requests", "is_half_day");
        
        try {
            await queryRunner.query(`ALTER TABLE "leave_balances_history" DROP CONSTRAINT "fk_leave_balances_history_employee"`);
        } catch (error) {
            // Constraint may not exist, continue
        }
        
        try {
            await queryRunner.query(`ALTER TABLE "leave_balances_history" DROP CONSTRAINT "fk_leave_balances_history_user"`);
        } catch (error) {
            // Constraint may not exist, continue
        }
        
        try {
            await queryRunner.query(`DROP INDEX "public"."idx_leave_balances_history_employee_id"`);
        } catch (error) {
            // Index may not exist, continue
        }
        
        try {
            await queryRunner.query(`DROP INDEX "public"."idx_leave_balances_history_year"`);
        } catch (error) {
            // Index may not exist, continue
        }
        
        // Only add the column if it doesn't exist
        if (!hasIsHalfDayColumn) {
            await queryRunner.query(`ALTER TABLE "leave_requests" ADD "is_half_day" boolean NOT NULL DEFAULT false`);
        }
        
        try {
            await queryRunner.query(`ALTER TABLE "leave_balances_history" DROP COLUMN "leave_type"`);
        } catch (error) {
            // Column may not exist, continue
        }
        
        try {
            await queryRunner.query(`CREATE TYPE "public"."leave_balances_history_leave_type_enum" AS ENUM('sick', 'casual', 'earned', 'compensation')`);
        } catch (error) {
            // Type may already exist, continue
        }
        
        try {
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ADD "leave_type" "public"."leave_balances_history_leave_type_enum" NOT NULL`);
        } catch (error) {
            // Column may already exist, continue
        }
        
        try {
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ALTER COLUMN "used_days" SET DEFAULT '0'`);
        } catch (error) {
            // Default may already be set, continue
        }
        
        try {
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ALTER COLUMN "carry_forward" SET NOT NULL`);
        } catch (error) {
            // Already NOT NULL, continue
        }
        
        try {
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ALTER COLUMN "archived_at" SET NOT NULL`);
        } catch (error) {
            // Already NOT NULL, continue
        }
        
        try {
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ADD CONSTRAINT "FK_f61fe9d2664fb0df2db54b315eb" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        } catch (error) {
            // Constraint may already exist, continue
        }
        
        try {
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ADD CONSTRAINT "FK_0f263d9c3b840c81d6545c8ddd4" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        } catch (error) {
            // Constraint may already exist, continue
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leave_balances_history" DROP CONSTRAINT "FK_0f263d9c3b840c81d6545c8ddd4"`);
        await queryRunner.query(`ALTER TABLE "leave_balances_history" DROP CONSTRAINT "FK_f61fe9d2664fb0df2db54b315eb"`);
        await queryRunner.query(`ALTER TABLE "leave_balances_history" ALTER COLUMN "archived_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leave_balances_history" ALTER COLUMN "carry_forward" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leave_balances_history" ALTER COLUMN "used_days" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "leave_balances_history" DROP COLUMN "leave_type"`);
        await queryRunner.query(`DROP TYPE "public"."leave_balances_history_leave_type_enum"`);
        await queryRunner.query(`ALTER TABLE "leave_balances_history" ADD "leave_type" character varying(50) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP COLUMN "is_half_day"`);
        await queryRunner.query(`CREATE INDEX "idx_leave_balances_history_year" ON "leave_balances_history" ("year") `);
        await queryRunner.query(`CREATE INDEX "idx_leave_balances_history_employee_id" ON "leave_balances_history" ("employee_id") `);
        await queryRunner.query(`ALTER TABLE "leave_balances_history" ADD CONSTRAINT "fk_leave_balances_history_user" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_balances_history" ADD CONSTRAINT "fk_leave_balances_history_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
