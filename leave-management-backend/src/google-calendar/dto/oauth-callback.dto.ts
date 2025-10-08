import { IsString, IsNotEmpty } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  state: string;
}
