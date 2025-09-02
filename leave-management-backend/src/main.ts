import { NestFactory } from "@nestjs/core";
import { ValidationPipe, RequestMethod } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { DatabaseCreationService } from "./database/database-creation.service";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { existsSync } from "fs";
import { UserRole } from "./common/enums/user-role.enum";
import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";

async function createInitialData(app: NestExpressApplication): Promise<void> {
  try {
    const dataSource = app.get(DataSource);

    // Create sample departments using raw SQL
    console.log("🔧 Checking departments...");
    const departmentCount = await dataSource.query(
      "SELECT COUNT(*) FROM departments",
    );

    if (parseInt(departmentCount[0].count) === 0) {
      console.log("🔧 Creating sample departments...");
      await dataSource.query(`
        INSERT INTO departments (id, name, created_at) VALUES
        (gen_random_uuid(), 'Engineering', NOW()),
        (gen_random_uuid(), 'QA', NOW()),
        (gen_random_uuid(), 'Product', NOW()),
        (gen_random_uuid(), 'Sales', NOW()),
        (gen_random_uuid(), 'Devrel/ Support/ Solution', NOW()),
        (gen_random_uuid(), 'Marketing', NOW()),
        (gen_random_uuid(), 'HR', NOW()),
        (gen_random_uuid(), 'Finance', NOW())
        ON CONFLICT (name) DO NOTHING;
      `);
      console.log("✅ Sample departments created");
    } else {
      console.log("✅ Departments already exist");

      // Ensure Finance department exists (for bulk import compatibility)
      await dataSource.query(`
        INSERT INTO departments (id, name, created_at) VALUES
        (gen_random_uuid(), 'Finance', NOW())
        ON CONFLICT (name) DO NOTHING;
      `);
    }

    // Check if admin user already exists using raw SQL
    console.log("🔧 Checking admin user...");
    const existingAdmin = await dataSource.query(
      "SELECT id, email FROM users WHERE email = $1",
      ["admin@company.com"],
    );

    // Generate password hash
    const passwordHash = await bcrypt.hash("admin123", 10);

    if (existingAdmin.length > 0) {
      console.log("🔧 Admin user exists, updating password...");
      await dataSource.query(
        `
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE email = $2
      `,
        [passwordHash, "admin@company.com"],
      );
      console.log("✅ Admin password updated");
    } else {
      console.log("🔧 Creating new admin user...");
      await dataSource.query(
        `
        INSERT INTO users (id, email, password_hash, role, is_active, must_change_password, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      `,
        ["admin@company.com", passwordHash, "admin", true, false],
      );
      console.log("✅ Admin user created successfully");
    }
  } catch (error) {
    console.error("❌ Failed to create initial data:", error);
    // Don't exit - continue with app startup
  }
}

async function bootstrap() {
  console.log("🔧 Bootstrap starting...");

  try {
    console.log("🔧 Creating temporary app for database setup...");
    // Create a temporary app instance just for database creation
    const tempApp = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log"],
    });

    console.log("🔧 Getting database creation service...");
    const databaseCreationService = tempApp.get(DatabaseCreationService);

    try {
      console.log("🔧 Ensuring database exists...");
      // Ensure database exists before starting the main application
      await databaseCreationService.ensureDatabaseExists();
      console.log("✅ Database setup completed");
    } catch (error) {
      console.error("❌ Failed to ensure database exists:", error);
      process.exit(1);
    } finally {
      console.log("🔧 Closing temporary app...");
      await tempApp.close();
    }
  } catch (error) {
    console.error("❌ Failed to create temporary app:", error);
    process.exit(1);
  }

  // Now create the main application
  console.log("🔧 Creating main application...");
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  console.log("🔧 Getting config service...");
  const configService = app.get(ConfigService);

  // Create initial data after TypeORM schema sync
  console.log("🔧 Creating initial data after schema sync...");
  await createInitialData(app);

  // Global prefix for API routes, excluding static/frontend routes
  app.setGlobalPrefix(configService.get("API_PREFIX", "api"), {
    exclude: [
      { path: "health", method: RequestMethod.GET },
      { path: "*", method: RequestMethod.GET },
    ],
  });

  // Serve static files (frontend build)
  const publicPath = join(process.cwd(), "public");
  if (existsSync(publicPath)) {
    app.useStaticAssets(publicPath);
    console.log(`📁 Serving static files from: ${publicPath}`);
  }

  // CORS - Allow frontend origin or all origins in production
  const isProduction = configService.get("NODE_ENV") === "production";
  app.enableCors({
    origin: isProduction
      ? true
      : configService.get("FRONTEND_URL", "http://localhost:8081"),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Leave Management API")
    .setDescription("Backend API for Leave Management System")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = configService.get("PORT", 3000);
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
