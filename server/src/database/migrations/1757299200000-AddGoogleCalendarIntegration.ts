import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddGoogleCalendarIntegration1757299200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if google_calendar_tokens table already exists
    const hasGoogleCalendarTokensTable = await queryRunner.hasTable('google_calendar_tokens');

    if (!hasGoogleCalendarTokensTable) {
      // Create google_calendar_tokens table
      await queryRunner.createTable(
        new Table({
          name: 'google_calendar_tokens',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'employee_id',
              type: 'uuid',
              isUnique: true,
            },
            {
              name: 'access_token',
              type: 'text',
            },
            {
              name: 'refresh_token',
              type: 'text',
            },
            {
              name: 'token_expiry',
              type: 'timestamp',
            },
            {
              name: 'scope',
              type: 'text',
            },
            {
              name: 'is_active',
              type: 'boolean',
              default: true,
            },
            {
              name: 'last_sync_at',
              type: 'timestamp',
              isNullable: true,
            },
            {
              name: 'last_sync_error',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Add foreign key for employee_id
      await queryRunner.createForeignKey(
        'google_calendar_tokens',
        new TableForeignKey({
          columnNames: ['employee_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'employees',
          onDelete: 'CASCADE',
        }),
      );
    }

    // Check if calendar_events table already exists
    const hasCalendarEventsTable = await queryRunner.hasTable('calendar_events');

    if (!hasCalendarEventsTable) {
      // Create calendar_events table
      await queryRunner.createTable(
        new Table({
          name: 'calendar_events',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'uuid_generate_v4()',
            },
            {
              name: 'leave_request_id',
              type: 'uuid',
            },
            {
              name: 'google_event_id',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'calendar_id',
              type: 'varchar',
              length: '255',
            },
            {
              name: 'calendar_type',
              type: 'enum',
              enum: ['personal', 'shared'],
            },
            {
              name: 'employee_id',
              type: 'uuid',
            },
            {
              name: 'sync_status',
              type: 'varchar',
              length: '50',
              default: "'synced'",
            },
            {
              name: 'sync_error',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'created_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'updated_at',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true,
      );

      // Add foreign key for leave_request_id
      await queryRunner.createForeignKey(
        'calendar_events',
        new TableForeignKey({
          columnNames: ['leave_request_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'leave_requests',
          onDelete: 'CASCADE',
        }),
      );

      // Add index for faster lookups
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_calendar_events_leave_request ON calendar_events(leave_request_id)`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_calendar_events_employee ON calendar_events(employee_id)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_calendar_events_employee`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_calendar_events_leave_request`);

    // Drop foreign keys
    const calendarEventsTable = await queryRunner.getTable('calendar_events');
    const leaveRequestFk = calendarEventsTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('leave_request_id') !== -1,
    );
    if (leaveRequestFk) {
      await queryRunner.dropForeignKey('calendar_events', leaveRequestFk);
    }

    const tokensTable = await queryRunner.getTable('google_calendar_tokens');
    const employeeFk = tokensTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('employee_id') !== -1,
    );
    if (employeeFk) {
      await queryRunner.dropForeignKey('google_calendar_tokens', employeeFk);
    }

    // Drop tables
    await queryRunner.dropTable('calendar_events');
    await queryRunner.dropTable('google_calendar_tokens');
  }
}
