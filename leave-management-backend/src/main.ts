import { NestFactory } from "@nestjs/core";
import { ValidationPipe, RequestMethod } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { DatabaseCreationService } from "./database/database-creation.service";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { existsSync } from "fs";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "./users/entities/user.entity";
import { UserRole } from "./common/enums/user-role.enum";
import { Department } from "./departments/entities/department.entity";
import * as bcrypt from "bcrypt";

async function createInitialData(app: NestExpressApplication): Promise<void> {
  try {
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const departmentRepository = app.get<Repository<Department>>(getRepositoryToken(Department));
    
    // Create sample departments first
    const departmentCount = await departmentRepository.count();
    if (departmentCount === 0) {
      console.log("🔧 Creating sample departments...");
      const departments = [
        { name: "Information Technology" },
        { name: "Human Resources" },
        { name: "Finance" },
        { name: "Marketing" },
        { name: "Engineering" },
        { name: "Sales" }
      ];
      
      for (const dept of departments) {
        const department = departmentRepository.create(dept);
        await departmentRepository.save(department);
      }
      console.log("✅ Sample departments created");
    } else {
      console.log("✅ Departments already exist");
    }
    
    // Check if admin user already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: "admin@company.com" }
    });
    
    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      return;
    }
    
    // Create admin user
    console.log("🔧 Creating admin user...");
    const passwordHash = await bcrypt.hash("admin123", 10);
    
    const adminUser = userRepository.create({
      email: "admin@company.com",
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false,
    });
    
    await userRepository.save(adminUser);
    console.log("✅ Admin user created successfully");
    
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
    const tempApp = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
    
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
      { path: 'health', method: RequestMethod.GET },
      { path: '*', method: RequestMethod.GET }
    ]
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
