import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Holiday } from "./entities/holiday.entity";
import { CreateHolidayDto } from "./dto/create-holiday.dto";
import { UpdateHolidayDto } from "./dto/update-holiday.dto";

@Injectable()
export class HolidaysService {
  constructor(
    @InjectRepository(Holiday)
    private holidayRepository: Repository<Holiday>,
  ) {}

  async create(createHolidayDto: CreateHolidayDto): Promise<Holiday> {
    const holiday = this.holidayRepository.create({
      ...createHolidayDto,
      date: new Date(createHolidayDto.date),
    });

    return this.holidayRepository.save(holiday);
  }

  async findAll(options?: {
    year?: number;
    isActive?: boolean;
  }): Promise<Holiday[]> {
    const queryBuilder = this.holidayRepository.createQueryBuilder("holiday");

    if (options?.year) {
      const startOfYear = new Date(options.year, 0, 1);
      const endOfYear = new Date(options.year, 11, 31);
      queryBuilder.andWhere(
        "holiday.date BETWEEN :startOfYear AND :endOfYear",
        {
          startOfYear,
          endOfYear,
        },
      );
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere("holiday.isActive = :isActive", {
        isActive: options.isActive,
      });
    }

    return queryBuilder.orderBy("holiday.date", "ASC").getMany();
  }

  async findOne(id: string): Promise<Holiday> {
    const holiday = await this.holidayRepository.findOne({ where: { id } });

    if (!holiday) {
      throw new NotFoundException("Holiday not found");
    }

    return holiday;
  }

  async update(
    id: string,
    updateHolidayDto: UpdateHolidayDto,
  ): Promise<Holiday> {
    const holiday = await this.findOne(id);

    if (updateHolidayDto.date) {
      updateHolidayDto.date = new Date(updateHolidayDto.date).toISOString();
    }

    Object.assign(holiday, updateHolidayDto);

    return this.holidayRepository.save(holiday);
  }

  async remove(id: string): Promise<void> {
    const holiday = await this.findOne(id);
    await this.holidayRepository.remove(holiday);
  }

  async getUpcomingHolidays(days: number = 30): Promise<Holiday[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.holidayRepository.find({
      where: {
        date: Between(today, futureDate),
        isActive: true,
      },
      order: {
        date: "ASC",
      },
    });
  }

  async getHolidaysForMonth(month: number, year: number): Promise<Holiday[]> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    return this.holidayRepository.find({
      where: {
        date: Between(startOfMonth, endOfMonth),
        isActive: true,
      },
      order: {
        date: "ASC",
      },
    });
  }

  async getHolidayStats(): Promise<{
    totalHolidays: number;
    activeHolidays: number;
    upcomingHolidays: number;
  }> {
    const currentYear = new Date().getFullYear();
    const today = new Date();
    const endOfYear = new Date(currentYear, 11, 31);

    const [totalHolidays, activeHolidays, upcomingHolidays] = await Promise.all(
      [
        this.holidayRepository.count({
          where: {
            date: Between(new Date(currentYear, 0, 1), endOfYear),
          },
        }),
        this.holidayRepository.count({
          where: {
            date: Between(new Date(currentYear, 0, 1), endOfYear),
            isActive: true,
          },
        }),
        this.holidayRepository.count({
          where: {
            date: Between(today, endOfYear),
            isActive: true,
          },
        }),
      ],
    );

    return {
      totalHolidays,
      activeHolidays,
      upcomingHolidays,
    };
  }
}
