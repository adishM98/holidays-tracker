#!/usr/bin/env ts-node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DatabaseCreationService } from '../src/database/database-creation.service';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Load environment variables
config();

async function createDatabase() {
  console.log('🚀 Starting database creation and setup...\n');

  try {
    // Create a temporary app instance for database creation
    const app = await NestFactory.create(AppModule, { 
      logger: ['log', 'error', 'warn'] 
    });
    
    const configService = app.get(ConfigService);
    const databaseCreationService = app.get(DatabaseCreationService);

    // Step 1: Ensure database exists
    console.log('📊 Step 1: Creating database if it doesn\'t exist...');
    await databaseCreationService.ensureDatabaseExists();
    console.log('✅ Database creation step completed\n');

    // Step 2: Run database synchronization to create tables
    console.log('📋 Step 2: Creating database tables...');
    
    // Create DataSource for direct table creation
    const dataSource = new DataSource({
      type: 'postgres',
      host: configService.get('DATABASE_HOST'),
      port: configService.get('DATABASE_PORT'),
      username: configService.get('DATABASE_USERNAME'),
      password: configService.get('DATABASE_PASSWORD'),
      database: configService.get('DATABASE_NAME'),
      entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
      synchronize: true, // This will create the tables
      logging: false,
      ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    });

    await dataSource.initialize();
    console.log('✅ Database tables created successfully');
    
    // Close the datasource connection
    await dataSource.destroy();
    console.log('✅ Database connection closed');

    // Close the app instance
    await app.close();

    console.log('\n🎉 Database setup completed successfully!');
    console.log('📝 You can now start the application with: npm run start:dev');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  createDatabase();
}

export { createDatabase };