import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class SupplierDto {
  @Transform(trim) @IsString() @Length(2, 160)
  name!: string;

  @Transform(trim) @IsOptional() @IsString() @MaxLength(160)
  tradeName?: string | null;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().replace(/[.\s/()-]/g, '') || null : value)
  @IsOptional() @IsString() @Matches(/^(\d{11}|\d{14})$/, { message: 'Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.' })
  document?: string | null;

  @Transform(trim) @IsOptional() @IsString() @MaxLength(100)
  contactName?: string | null;

  @Transform(trim) @IsOptional() @IsString() @Matches(/^(?:[+()\d\s.-]{8,25})?$/, { message: 'Informe um telefone válido.' })
  phone?: string | null;

  @Transform(trim) @IsOptional() @IsString() @Matches(/^(?:[+()\d\s.-]{8,25})?$/, { message: 'Informe um WhatsApp válido.' })
  whatsapp?: string | null;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() || null : value)
  @IsOptional() @IsEmail({}, { message: 'Informe um e-mail válido.' }) @MaxLength(160)
  email?: string | null;

  @Transform(trim) @IsOptional() @IsString() @MaxLength(500)
  address?: string | null;

  @Transform(trim) @IsOptional() @IsString() @MaxLength(100)
  city?: string | null;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() || null : value)
  @IsOptional() @IsIn(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])
  state?: string | null;

  @Transform(trim) @IsOptional() @IsString() @MaxLength(300)
  paymentTerms?: string | null;

  @Transform(trim) @IsOptional() @IsString() @MaxLength(2000)
  notes?: string | null;

  @IsBoolean()
  active!: boolean;
}

export class SupplierQueryDto {
  @Transform(trim) @IsOptional() @IsString() @MaxLength(160)
  search?: string;

  @IsOptional() @IsIn(['all', 'active', 'inactive'])
  status?: 'all' | 'active' | 'inactive';

  @Type(() => Number) @IsInt() @Min(1) @Max(1000000)
  page = 1;
}
