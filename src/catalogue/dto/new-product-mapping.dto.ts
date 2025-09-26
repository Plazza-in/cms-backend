import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class NewProductMappingDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsString()
  @IsNotEmpty()
  item_code: string;

  @IsOptional()
  @IsString()
  'Store Inventory'?: string;

  @IsOptional()
  @IsString()
  'Location'?: string;

  @IsOptional()
  @IsInt()
  inventory_quantity?: number;
}
