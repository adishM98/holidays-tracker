import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSystemSettingsTable1759930980146 implements MigrationInterface {
    name = 'AddSystemSettingsTable1759930980146'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if system_settings table exists
        const tableExists = await queryRunner.hasTable("system_settings");

        if (!tableExists) {
            // Create system_settings table
            await queryRunner.query(`
                CREATE TABLE "system_settings" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "key" character varying NOT NULL,
                    "value" text,
                    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_system_settings" PRIMARY KEY ("id"),
                    CONSTRAINT "UQ_system_settings_key" UNIQUE ("key")
                )
            `);

            // Create index on key column for faster lookups
            await queryRunner.query(`CREATE INDEX "IDX_system_settings_key" ON "system_settings" ("key")`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop system_settings table if it exists
        const tableExists = await queryRunner.hasTable("system_settings");

        if (tableExists) {
            await queryRunner.query(`DROP INDEX IF EXISTS "IDX_system_settings_key"`);
            await queryRunner.query(`DROP TABLE "system_settings"`);
        }
    }

}
