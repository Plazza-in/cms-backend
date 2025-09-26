import { IsString, IsNotEmpty, IsOptional, IsNumberString } from 'class-validator';

export class NewProductDistributorDto {
  @IsString()
  @IsNotEmpty()
  product_name: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  normalized_name?: string;

  @IsString()
  @IsNotEmpty()
  item_code: string;

  @IsOptional()
  @IsString()
  hsn_code?: string;

  @IsOptional()
  @IsString()
  package?: string;

  @IsString()
  @IsNotEmpty()
  distributor: string;

  @IsNumberString()
  @IsNotEmpty()
  mrp: string;

  @IsNumberString()
  @IsNotEmpty()
  purchase_rate: string;

  @IsOptional()
  @IsString()
  s?: string; // Yes/No field

  @IsNumberString()
  @IsNotEmpty()
  gst_rate: string;

  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  original_item_code?: string;

  // Calculated fields (will be computed)
  margin?: number;
  effective_customer_discount?: number;
  plazza_selling_price_incl_gst?: number;
}
