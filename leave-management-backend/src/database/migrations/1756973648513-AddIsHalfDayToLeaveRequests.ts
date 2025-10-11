import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsHalfDayToLeaveRequests1756973648513 implements MigrationInterface {
    name = 'AddIsHalfDayToLeaveRequests1756973648513'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if is_half_day column already exists
        const hasIsHalfDayColumn = await queryRunner.hasColumn("leave_requests", "is_half_day");

        // Only add the column if it doesn't exist
        if (!hasIsHalfDayColumn) {
            await queryRunner.query(`ALTER TABLE "leave_requests" ADD "is_half_day" boolean NOT NULL DEFAULT false`);
        }

        // Check if leave_type column type needs migration
        const leaveTypeColumnResult = await queryRunner.query(`
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'leave_balances_history'
            AND column_name = 'leave_type'
        `);

        // Only migrate if leave_type is VARCHAR (old format) and not already an enum
        if (leaveTypeColumnResult.length > 0 && leaveTypeColumnResult[0].data_type === 'character varying') {
            // Drop old constraints and indexes that reference this column
            await queryRunner.query(`ALTER TABLE "leave_balances_history" DROP CONSTRAINT IF EXISTS "fk_leave_balances_history_employee"`);
            await queryRunner.query(`ALTER TABLE "leave_balances_history" DROP CONSTRAINT IF EXISTS "fk_leave_balances_history_user"`);
            await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_leave_balances_history_employee_id"`);
            await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_leave_balances_history_year"`);

            // Migrate leave_type from VARCHAR to ENUM
            await queryRunner.query(`ALTER TABLE "leave_balances_history" DROP COLUMN "leave_type"`);
            await queryRunner.query(`CREATE TYPE "public"."leave_balances_history_leave_type_enum" AS ENUM('sick', 'casual', 'earned', 'compensation')`);
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ADD "leave_type" "public"."leave_balances_history_leave_type_enum" NOT NULL`);

            // Set defaults and NOT NULL constraints
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ALTER COLUMN "used_days" SET DEFAULT '0'`);
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ALTER COLUMN "carry_forward" SET NOT NULL`);
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ALTER COLUMN "archived_at" SET NOT NULL`);

            // Recreate foreign key constraints
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ADD CONSTRAINT "FK_f61fe9d2664fb0df2db54b315eb" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
            await queryRunner.query(`ALTER TABLE "leave_balances_history" ADD CONSTRAINT "FK_0f263d9c3b840c81d6545c8ddd4" FOREIGN KEY ("archived_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        }
        // If leave_type is already an enum (created by TypeORM sync), skip the migration entirely
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
