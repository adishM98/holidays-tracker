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
   * Creates the database if it doesn't exist
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
   * Runs the init-db.sql script to set up initial data
   */
  private async runInitScript(client: Client): Promise<void> {
    const initScriptPath = path.join(process.cwd(), "init-db.sql");

    if (!fs.existsSync(initScriptPath)) {
      this.logger.warn("init-db.sql not found, skipping initial data setup");
      return;
    }

    try {
      const initScript = fs.readFileSync(initScriptPath, "utf8");
      this.logger.log("Running init-db.sql script...");

      await client.query(initScript);
      this.logger.log("✅ Initial database setup completed");
    } catch (error) {
      this.logger.error("Error running init script:", error);
      // Don't throw error - the database exists, just the init script failed
    }
  }
}
