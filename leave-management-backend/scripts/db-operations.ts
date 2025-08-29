#!/usr/bin/env ts-node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DatabaseCreationService } from '../src/database/database-creation.service';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { Client } from 'pg';

// Load environment variables
config();

class DatabaseOperations {
  private app: any;
  private configService: ConfigService;
  private dataSource: DataSource | null = null;

  async initialize() {
    // Create app instance
    this.app = await NestFactory.create(AppModule, { 
      logger: ['error', 'warn'] // Minimal logging for cleaner output
    });
    this.configService = this.app.get(ConfigService);
  }

  async createDatabase() {
    console.log('📊 Creating database if it doesn\'t exist...');
    const databaseCreationService = this.app.get(DatabaseCreationService);
    await databaseCreationService.ensureDatabaseExists();
    console.log('✅ Database creation completed');
  }

  async createTables() {
    console.log('📋 Creating database tables...');
    
    // Create DataSource for table creation
    this.dataSource = new DataSource({
      type: 'postgres',
      host: this.configService.get('DATABASE_HOST'),
      port: this.configService.get('DATABASE_PORT'),
      username: this.configService.get('DATABASE_USERNAME'),
      password: this.configService.get('DATABASE_PASSWORD'),
      database: this.configService.get('DATABASE_NAME'),
      entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
      synchronize: true, // This will create the tables
      logging: false,
      ssl: this.configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    });

    await this.dataSource.initialize();
    console.log('✅ Database tables created successfully');
  }

  async dropDatabase() {
    console.log('🗑️ Dropping database...');
    
    const dbName = this.configService.get('DATABASE_NAME');
    const client = new Client({
      host: this.configService.get('DATABASE_HOST'),
      port: this.configService.get('DATABASE_PORT'),
      user: this.configService.get('DATABASE_USERNAME'),
      password: this.configService.get('DATABASE_PASSWORD'),
      database: 'postgres', // Connect to default postgres database
    });

    try {
      await client.connect();
      
      // Terminate existing connections to the database
      await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity 
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [dbName]);
      
      // Drop the database
      await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      console.log(`✅ Database '${dbName}' dropped successfully`);
      
    } catch (error) {
      console.error('❌ Error dropping database:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async checkDatabaseStatus() {
    console.log('🔍 Checking database status...\n');
    
    const dbName = this.configService.get('DATABASE_NAME');
    const client = new Client({
      host: this.configService.get('DATABASE_HOST'),
      port: this.configService.get('DATABASE_PORT'),
      user: this.configService.get('DATABASE_USERNAME'),
      password: this.configService.get('DATABASE_PASSWORD'),
      database: 'postgres',
    });

    try {
      await client.connect();
      
      // Check if database exists
      const dbExists = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName]
      );
      
      console.log(`📊 Database '${dbName}': ${dbExists.rows.length > 0 ? '✅ EXISTS' : '❌ DOES NOT EXIST'}`);
      
      if (dbExists.rows.length > 0) {
        // Connect to the target database to check tables
        await client.end();
        
        const dbClient = new Client({
          host: this.configService.get('DATABASE_HOST'),
          port: this.configService.get('DATABASE_PORT'),
          user: this.configService.get('DATABASE_USERNAME'),
          password: this.configService.get('DATABASE_PASSWORD'),
          database: dbName,
        });
        
        await dbClient.connect();
        
        // List tables
        const tables = await dbClient.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        
        console.log(`📋 Tables (${tables.rows.length}):`);
        if (tables.rows.length > 0) {
          tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
          });
        } else {
          console.log('   No tables found');
        }
        
        await dbClient.end();
      }
      
    } catch (error) {
      console.error('❌ Error checking database status:', error);
      throw error;
    } finally {
      try {
        await client.end();
      } catch (e) {
        // Ignore connection close errors
      }
    }
  }

  async cleanup() {
    if (this.dataSource) {
      await this.dataSource.destroy();
    }
    if (this.app) {
      await this.app.close();
    }
  }
}

async function main() {
  const operation = process.argv[2] || 'create';
  const dbOps = new DatabaseOperations();

  try {
    await dbOps.initialize();

    switch (operation.toLowerCase()) {
      case 'create':
        console.log('🚀 Creating database and tables...\n');
        await dbOps.createDatabase();
        await dbOps.createTables();
        console.log('\n🎉 Database setup completed successfully!');
        break;

      case 'drop':
        console.log('🚀 Dropping database...\n');
        await dbOps.dropDatabase();
        console.log('\n⚠️ Database dropped successfully!');
        break;

      case 'reset':
        console.log('🚀 Resetting database...\n');
        await dbOps.dropDatabase();
        await dbOps.createDatabase();
        await dbOps.createTables();
        console.log('\n🎉 Database reset completed successfully!');
        break;

      case 'status':
        await dbOps.checkDatabaseStatus();
        break;

      default:
        console.log('❌ Unknown operation. Available operations: create, drop, reset, status');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  } finally {
    await dbOps.cleanup();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}

export { DatabaseOperations };