import { IsArray, IsInt, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
  @IsOptional()
  @IsUUID()
  id?: string; // categories has default uuid, optional

  @IsString()
  code: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsObject()
  thumbnail_icon?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bg_img?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  banner?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  top_products?: string[];

  @IsOptional()
  @IsInt()
  rank?: number;

  @IsOptional()
  @IsObject()
  ui_configs?: Record<string, unknown>;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsObject()
  thumbnail_icon?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bg_img?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  banner?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  top_products?: string[];

  @IsOptional()
  @IsInt()
  rank?: number;

  @IsOptional()
  @IsObject()
  ui_configs?: Record<string, unknown>;
}

export class CreateUseCaseDto {
  @IsOptional()
  @IsUUID()
  id?: string; // use_cases has default uuid, optional

  @IsString()
  code: string;

  @IsUUID()
  l1_id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsObject()
  thumbnail_image?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bg_img?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  product_ids?: string[];

  @IsOptional()
  @IsObject()
  es_query?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  ui_configs?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  rank?: number;
}

export class UpdateUseCaseDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsUUID()
  l1_id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsObject()
  thumbnail_image?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bg_img?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  product_ids?: string[];

  @IsOptional()
  @IsObject()
  es_query?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  ui_configs?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  rank?: number;
}

export class CreateSubCategoryDto {
  @IsUUID()
  id: string; // required (no DB default)

  @IsString()
  code: string;

  @IsUUID()
  l2_id: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsObject()
  thumbnail_image?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bg_img?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  product_ids?: string[];

  @IsOptional()
  @IsObject()
  es_query?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  ui_configs?: Record<string, unknown>;

  @IsInt()
  rank: number; // required (no default)
}

export class UpdateSubCategoryDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsUUID()
  l2_id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsObject()
  thumbnail_image?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bg_img?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  product_ids?: string[];

  @IsOptional()
  @IsObject()
  es_query?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  ui_configs?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  rank?: number;
}


