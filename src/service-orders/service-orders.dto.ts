import { Transform, Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class OrderDeviceDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) brand!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) model!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) color?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(40) imei?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) serial?: string;
}
export class CreateOrderDto {
  @IsUUID() customerId!: string;
  @IsOptional() @IsUUID() deviceId?: string;
  @IsOptional() @ValidateNested() @Type(() => OrderDeviceDto) device?: OrderDeviceDto;
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(2000) reportedIssue!: string;
  @IsOptional() @IsDateString() estimatedDelivery?: string;
}
export class DeviceQueryDto {
  @IsUUID() customerId!: string;
}
export class OrderQueryDto {
  @IsOptional() @IsUUID() orderId?: string;
}
