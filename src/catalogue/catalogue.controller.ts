import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors, Res, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CatalogueService } from './catalogue.service';
import { CreateCatalogueDto } from './dto/create-catalogue.dto';
import { UpdateCatalogueDto } from './dto/update-catalogue.dto';
import { DeleteCatalogueDto } from './dto/delete-catalogue.dto';
import { CsvUploadService } from './csv-upload.service';
import { NewProductUploadService } from './new-product-upload.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('catalogue')
@UseGuards(AdminGuard)
export class CatalogueController {
  constructor(
    private readonly service: CatalogueService,
    private readonly csvUploadService: CsvUploadService,
    private readonly newProductUploadService: NewProductUploadService,
  ) {}

  @Get()
  list(
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
    @Query('search') search?: string,
    @Query('q') q?: string,
  ) {
    const term = (search ?? q)?.toString();
    return this.service.findAll(Number(limit), Number(offset), term);
  }

  @Get('search-es')
  searchEs(
    @Query('q') q: string,
    @Query('size') size = '10',
  ) {
    return this.service.searchElasticsearch(q, Number(size));
  }

  @Get('search-es/:product_id')
  searchEsById(@Param('product_id') product_id: string) {
    return this.service.searchElasticsearchByProductId(product_id);
  }

  @Get(':product_id')
  get(@Param('product_id') product_id: string) {
    return this.service.findOne(product_id);
  }

  @Post()
  create(@Body() dto: CreateCatalogueDto) {
    return this.service.create(dto);
  }

  @Post('bulk')
  bulk(@Body() body: { items: CreateCatalogueDto[] }) {
    const items = Array.isArray(body) ? (body as any) : body.items;
    return this.service.bulkCreate(items ?? []);
  }

  @Patch(':product_id')
  update(@Param('product_id') product_id: string, @Body() dto: UpdateCatalogueDto) {
    return this.service.update(product_id, dto);
  }

  @Delete(':product_id')
  async remove(@Param('product_id') product_id: string) {
    return this.service.remove(product_id);
  }

  @Post('delete')
  async deleteProducts(@Body() dto: DeleteCatalogueDto) {
    // Handle single product deletion
    if (dto.product_id) {
      const result = await this.service.remove(dto.product_id);
      return {
        message: result.message,
        deleted: result.deleted ? 1 : 0,
        errors: result.deleted ? [] : [{ product_id: dto.product_id, error: result.message }]
      };
    }

    // Handle bulk product deletion
    if (dto.product_ids && dto.product_ids.length > 0) {
      return this.service.bulkRemove(dto.product_ids);
    }

    // Return error if neither single nor bulk deletion parameters provided
    return {
      message: 'Either product_id or product_ids must be provided',
      deleted: 0,
      errors: [{ error: 'Invalid request: missing product_id or product_ids' }]
    };
  }

  @Post('upload-csv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      return { error: 'File must be a CSV' };
    }

    return this.csvUploadService.uploadCsv(file.buffer);
  }

  @Post('upload-csv-with-download')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsvWithDownload(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      return res.status(400).json({ error: 'File must be a CSV' });
    }

    const result = await this.csvUploadService.uploadCsv(file.buffer);
    
    // Set headers for CSV download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `skipped_products_${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send CSV content
    return res.send(result.skipped_csv);
  }

  // New product upload endpoints
  @Post('new-products/metadata')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNewProductMetadata(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      return { error: 'File must be a CSV' };
    }

    return this.newProductUploadService.uploadMetadataCsv(file.buffer);
  }

  @Post('new-products/distributor')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNewProductDistributor(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      return { error: 'File must be a CSV' };
    }

    return this.newProductUploadService.uploadDistributorCsv(file.buffer);
  }

  @Post('new-products/mapping')
  @UseInterceptors(FileInterceptor('file'))
  async uploadNewProductMapping(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      return { error: 'File must be a CSV' };
    }

    return this.newProductUploadService.uploadMappingCsv(file.buffer);
  }
}


