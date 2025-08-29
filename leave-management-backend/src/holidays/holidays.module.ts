import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HolidaysService } from "./holidays.service";
import { Holiday } from "./entities/holiday.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Holiday])],
  providers: [HolidaysService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
