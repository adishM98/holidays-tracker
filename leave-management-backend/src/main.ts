import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { DatabaseCreationService } from "./database/database-creation.service";

async function bootstrap() {
  // Create a temporary app instance just for database creation
  const tempApp = await NestFactory.create(AppModule, { logger: false });
  const databaseCreationService = tempApp.get(DatabaseCreationService);

  try {
    // Ensure database exists before starting the main application
    await databaseCreationService.ensureDatabaseExists();
  } catch (error) {
    console.error("❌ Failed to ensure database exists:", error);
    process.exit(1);
  } finally {
    await tempApp.close();
  }

  // Now create the main application
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix(configService.get("API_PREFIX", "api"));

  // CORS
  app.enableCors({
    origin: configService.get("FRONTEND_URL"),
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
