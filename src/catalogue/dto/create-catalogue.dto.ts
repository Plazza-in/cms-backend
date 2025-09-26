import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

function toStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  const raw = String(value).trim();
  if (!raw) return undefined;
  return raw.includes(',') ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [raw];
}

export class CreateCatalogueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  product_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  dist_item_code: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  manufacturers?: string;

  @IsOptional()
  @IsString()
  salt_composition?: string;

  @IsOptional()
  @IsString()
  medicine_type?: string;

  @IsOptional()
  c1?: Record<string, unknown>;

  @IsOptional()
  c2?: Record<string, unknown>;

  @IsOptional()
  c3?: Record<string, unknown>;

  @IsOptional()
  c4?: Record<string, unknown>;

  @IsOptional()
  c5?: Record<string, unknown>;

  @IsOptional() @IsString() introduction?: string;
  @IsOptional() @IsString() benefits?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() how_to_use?: string;
  @IsOptional() @IsString() safety_advise?: string;
  @IsOptional() @IsString() if_miss?: string;
  @IsOptional() @IsString() packaging_detail?: string;
  @IsOptional() @IsString() package?: string;
  @IsOptional() @IsString() qty?: string;
  @IsOptional() @IsString() product_form?: string;

  @IsOptional()
  @IsNumberString()
  mrp?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === '' || value == null) return undefined;
    const s = String(value).toLowerCase().trim();
    if (['true', '1', 'yes', 'y', 't'].includes(s)) return true;
    if (['false', '0', 'no', 'n', 'f'].includes(s)) return false;
    return undefined;
  })
  prescription_required?: boolean;

  @IsOptional() @IsString() fact_box?: string;
  @IsOptional() @IsString() primary_use?: string;
  @IsOptional() @IsString() storage?: string;
  @IsOptional() @IsString() use_of?: string;
  @IsOptional() @IsString() common_side_effect?: string;
  @IsOptional() @IsString() alcohol_interaction?: string;
  @IsOptional() @IsString() pregnancy_interaction?: string;
  @IsOptional() @IsString() lactation_interaction?: string;
  @IsOptional() @IsString() driving_interaction?: string;
  @IsOptional() @IsString() kidney_interaction?: string;
  @IsOptional() @IsString() liver_interaction?: string;
  @IsOptional() @IsString() manufacturer_address?: string;
  @IsOptional() @IsString() q_a?: string;
  @IsOptional() @IsString() how_it_works?: string;
  @IsOptional() @IsString() interaction?: string;
  @IsOptional() @IsString() manufacturer_details?: string;
  @IsOptional() @IsString() marketer_details?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() normalized_name?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  image_url?: string[];

  @IsOptional() @IsNumberString() distributor_mrp?: string;
  @IsOptional() @IsNumberString() plazza_selling_price_incl_gst?: string;
  @IsOptional() @IsNumberString() effective_customer_discount?: string;
  @IsOptional() @IsString() distributor?: string;
  @IsOptional() @IsString() plazza_price_pack?: string;
  @IsOptional() @IsString() fulfilled_by?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  name_search_words?: string[];

  @IsOptional() @IsString() directions_for_use?: string;
  @IsOptional() @IsString() information?: string;
  @IsOptional() @IsString() key_benefits?: string;
  @IsOptional() @IsString() key_ingredients?: string;
  @IsOptional() @IsString() safety_information?: string;
  @IsOptional() @IsString() breadcrumbs?: string;
  @IsOptional() @IsString() country_of_origin?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => toStringArray(value))
  location?: string[];

  @IsOptional()
  @IsInt()
  @Transform(({ value }) => {
    if (value == null || String(value).trim() === '') return undefined;
    const n = Number.parseInt(String(value), 10);
    return Number.isNaN(n) ? undefined : n;
  })
  inventory_quantity?: number;

  @IsOptional() @IsString() product_category_name?: string;
  @IsOptional() @IsString() product_category_id?: string;
  @IsOptional() @IsString() product_use_case_name?: string;
  @IsOptional() @IsString() product_use_case_id?: string;
  @IsOptional() @IsString() product_sub_category_id?: string;
  @IsOptional() @IsString() product_sub_category_name?: string;
  @IsOptional() @IsNumberString() gst_rate?: string;
  @IsOptional() @IsString() hsn_code?: string;
  @IsOptional() @IsInt() rank?: number;

  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsBoolean() deferred_allowed?: boolean;
}


