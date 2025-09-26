import { IsArray, IsString, IsOptional } from 'class-validator';

export class DeleteCatalogueDto {
  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  product_ids?: string[];
}
