import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class DatabaseCreationService {
  private readonly logger = new Logger(DatabaseCreationService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Creates the database if it doesn't exist and ensures admin user exists
   */
  async ensureDatabaseExists(): Promise<void> {
    const dbName = this.configService.get("DATABASE_NAME");
    const host = this.configService.get("DATABASE_HOST");
    const port = this.configService.get("DATABASE_PORT");
    const username = this.configService.get("DATABASE_USERNAME");
    const password = this.configService.get("DATABASE_PASSWORD");

    // Create connection to postgres default database to check if our database exists
    const client = new Client({
      host,
      port,
      user: username,
      password,
      database: "postgres", // Connect to default postgres database
    });

    try {
      await client.connect();
      this.logger.log("Connected to PostgreSQL server");

      // Check if our database exists
      const result = await client.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbName],
      );

      if (result.rows.length === 0) {
        this.logger.log(`Database '${dbName}' does not exist. Creating it...`);

        // Create the database
        await client.query(`CREATE DATABASE "${dbName}"`);
        this.logger.log(`✅ Database '${dbName}' created successfully`);

        // Close connection to postgres and connect to new database to run init script
        await client.end();

        const newClient = new Client({
          host,
          port,
          user: username,
          password,
          database: dbName,
        });

        try {
          await newClient.connect();
          this.logger.log(`Connected to newly created database '${dbName}'`);

          // Run the init-db.sql script if it exists
          await this.runInitScript(newClient);
        } finally {
          await newClient.end();
        }
      } else {
        this.logger.log(`Database '${dbName}' already exists`);
      }
    } catch (error) {
      this.logger.error("Error ensuring database exists:", error);
      throw error;
    } finally {
      try {
        await client.end();
      } catch (error) {
        // Ignore connection close errors
      }
    }
  }

  /**
   * Creates initial admin user and sample data using TypeORM-compatible queries
   */
  private async runInitScript(client: Client): Promise<void> {
    try {
      this.logger.log("Creating initial admin user and sample data...");

      // Create admin user with bcrypt hash for password "admin123"
      await client.query(`
        INSERT INTO users (id, email, password_hash, role, is_active, must_change_password) 
        VALUES (
          gen_random_uuid(),
          'admin@company.com',
          '$2b$10$MU34VPcnxDLnPdGdpZOXOuk6zLAfT6LQYwHO/UIETUi8HtwJLUAJa',
          'admin',
          true,
          false
        ) ON CONFLICT (email) DO NOTHING;
      `);

      // Create sample departments
      await client.query(`
        INSERT INTO departments (id, name) VALUES 
          (gen_random_uuid(), 'Information Technology'),
          (gen_random_uuid(), 'Human Resources'),
          (gen_random_uuid(), 'Finance'),
          (gen_random_uuid(), 'Marketing')
        ON CONFLICT (name) DO NOTHING;
      `);

      this.logger.log("✅ Initial admin user and sample data created");
    } catch (error) {
      this.logger.error("Error creating initial data:", error);
      // Don't throw error - the database exists, just the init failed
    }
  }
}
