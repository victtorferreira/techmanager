import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class ProductDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) sku?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) category?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(200) compatibility?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) quality?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(120) location?: string;
  @IsOptional() @IsUUID() supplierId?: string | null;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) costPrice!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) salePrice!: number;
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) minimumStock?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class CreateProductDto extends ProductDto {
  @IsOptional() @IsInt() @Min(0) @Max(2147483647) stockQuantity?: number;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) purchaseDate?: string;
}
export class MovementDto {
  @IsIn(['PURCHASE', 'SERVICE_ORDER', 'RETURN', 'LOSS', 'ADJUSTMENT', 'WARRANTY']) type!: 'PURCHASE' | 'SERVICE_ORDER' | 'RETURN' | 'LOSS' | 'ADJUSTMENT' | 'WARRANTY';
  @IsInt() @Min(-2147483647) @Max(2147483647) quantity!: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) unitCost?: number;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() serviceOrderId?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) occurredAt?: string;
}
export class HistoryQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page: number = 1;
}
export class PurchaseQueryDto extends HistoryQueryDto {
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) to?: string;
}
