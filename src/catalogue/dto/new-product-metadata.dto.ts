import { IsString, IsNotEmpty, IsOptional, IsNumberString, IsBoolean } from 'class-validator';

export class NewProductMetadataDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsString()
  introduction?: string;

  @IsOptional()
  @IsString()
  benefits?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  how_to_use?: string;

  @IsOptional()
  @IsString()
  safety_advise?: string;

  @IsOptional()
  @IsString()
  if_miss?: string;

  @IsOptional()
  @IsString()
  packaging_detail?: string;

  @IsOptional()
  @IsString()
  package?: string;

  @IsOptional()
  @IsString()
  qty?: string;

  @IsOptional()
  @IsString()
  product_form?: string;

  @IsOptional()
  @IsNumberString()
  mrp?: string;

  @IsOptional()
  @IsBoolean()
  prescription_required?: boolean;

  @IsOptional()
  @IsString()
  fact_box?: string;

  @IsOptional()
  @IsString()
  primary_use?: string;

  @IsOptional()
  @IsString()
  storage?: string;

  @IsOptional()
  @IsString()
  use_of?: string;

  @IsOptional()
  @IsString()
  common_side_effect?: string;

  @IsOptional()
  @IsString()
  alcohol_interaction?: string;

  @IsOptional()
  @IsString()
  pregnancy_interaction?: string;

  @IsOptional()
  @IsString()
  lactation_interaction?: string;

  @IsOptional()
  @IsString()
  driving_interaction?: string;

  @IsOptional()
  @IsString()
  kidney_interaction?: string;

  @IsOptional()
  @IsString()
  liver_interaction?: string;

  @IsOptional()
  @IsString()
  manufacturer_address?: string;

  @IsOptional()
  @IsString()
  q_a?: string;

  @IsOptional()
  @IsString()
  how_it_works?: string;

  @IsOptional()
  @IsString()
  interaction?: string;

  @IsOptional()
  @IsString()
  manufacturer_details?: string;

  @IsOptional()
  @IsString()
  marketer_details?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  normalized_name?: string;

  @IsOptional()
  image_url?: string[];

  @IsOptional()
  @IsString()
  directions_for_use?: string;

  @IsOptional()
  @IsString()
  information?: string;

  @IsOptional()
  @IsString()
  key_benefits?: string;

  @IsOptional()
  @IsString()
  key_ingredients?: string;

  @IsOptional()
  @IsString()
  safety_information?: string;

  @IsOptional()
  @IsString()
  breadcrumbs?: string;

  @IsOptional()
  @IsString()
  country_of_origin?: string;

  @IsOptional()
  name_search_words?: string[];
}
