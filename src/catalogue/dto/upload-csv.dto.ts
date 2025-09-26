import { IsString, IsNotEmpty } from 'class-validator';

export class UploadCsvDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsString()
  @IsNotEmpty()
  item_code: string;

  // Optional fields from CSV that might be present
  'Store Inventory'?: string;
  'Location'?: string;
}
