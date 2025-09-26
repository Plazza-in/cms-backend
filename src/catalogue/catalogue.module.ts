import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Catalogue } from './catalogue.entity';
import { CatalogueService } from './catalogue.service';
import { CatalogueController } from './catalogue.controller';
import { CsvUploadService } from './csv-upload.service';
import { NewProductUploadService } from './new-product-upload.service';
import { AuthModule } from '../auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Catalogue]), AuthModule],
  providers: [CatalogueService, CsvUploadService, NewProductUploadService],
  controllers: [CatalogueController],
  exports: [TypeOrmModule],
})
export class CatalogueModule {}


