import { Controller, Get, Req, Res, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Request, Response } from "express";
import { join } from "path";
import { existsSync } from "fs";

@Controller()
export class StaticController {
  @Get("health")
  @ApiTags("System")
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiResponse({ status: 200, description: "Service is healthy" })
  healthCheck(@Res() res: Response) {
    res.status(HttpStatus.OK).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Leave Management API",
      version: "1.0.0",
    });
  }

  @Get("*")
  serveSPA(@Req() req: Request, @Res() res: Response) {
    // Don't serve index.html for API routes - let NestJS handle 404
    if (req.url.startsWith("/api/")) {
      res.status(HttpStatus.NOT_FOUND).json({
        statusCode: 404,
        message: "API endpoint not found",
        path: req.url,
      });
      return;
    }

    // Serve the React app's index.html for all non-API routes (SPA fallback)
    const indexPath = join(process.cwd(), "public", "index.html");
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Fallback response when frontend is not built
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: 503,
        message: "Frontend application is not available",
        error: "Service Unavailable",
      });
    }
  }
}
