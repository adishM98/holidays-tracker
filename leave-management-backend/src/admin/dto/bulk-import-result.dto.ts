import { ApiProperty } from '@nestjs/swagger';

export class ImportError {
  @ApiProperty()
  row: number;

  @ApiProperty()
  data: any;

  @ApiProperty()
  error: string;
}

export class BulkImportResultDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  successful: number;

  @ApiProperty()
  failed: number;

  @ApiProperty({ type: [ImportError] })
  errors: ImportError[];
}