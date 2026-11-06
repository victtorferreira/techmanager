import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { PaymentMethod, ServiceOrderStatus } from '@prisma/client';
export class UpdateOrderDto {
  @IsEnum(ServiceOrderStatus) status!: ServiceOrderStatus;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999999999) laborAmount!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(999999999) partsAmount!: number;
  @IsOptional() @IsString() @MaxLength(2000) diagnosis?: string;
}
export class OrderPaymentDto {
  @IsUUID() requestId!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(999999999) amount!: number;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) paidAt!: string;
}
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
