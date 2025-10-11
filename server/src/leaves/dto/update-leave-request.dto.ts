import { PartialType } from "@nestjs/swagger";
import { CreateLeaveRequestDto } from "./create-leave-request.dto";

export class UpdateLeaveRequestDto extends PartialType(CreateLeaveRequestDto) {}
