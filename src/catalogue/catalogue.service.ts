import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { Catalogue } from './catalogue.entity';
import { CreateCatalogueDto } from './dto/create-catalogue.dto';
import { UpdateCatalogueDto } from './dto/update-catalogue.dto';

@Injectable()
export class CatalogueService {
  private erpPool: Pool;

  constructor(
    @InjectRepository(Catalogue)
    private readonly catalogueRepo: Repository<Catalogue>,
    private readonly configService: ConfigService,
  ) {
    const erpConfig = this.configService.get('erpDatabase');
    if (erpConfig?.enable && erpConfig?.url) {
      this.erpPool = new Pool({
        connectionString: erpConfig.url,
        ssl: erpConfig.sslCertPath ? {
          rejectUnauthorized: true,
          ca: require('fs').readFileSync(erpConfig.sslCertPath, 'utf8'),
        } : false,
      });
    }
  }

  async findAll(limit = 50, offset = 0, searchTerm?: string): Promise<Catalogue[]> {
    const qb = this.catalogueRepo.createQueryBuilder('c')
      .take(limit)
      .skip(offset)
      .orderBy('c.updated_at', 'DESC');

    if (searchTerm && searchTerm.trim()) {
      const term = `%${searchTerm.trim().toLowerCase()}%`;
      qb.where(
        '(LOWER(c.name) LIKE :term OR LOWER(c.product_id) LIKE :term OR LOWER(c.dist_item_code) LIKE :term OR LOWER(c.salt_composition) LIKE :term)',
        { term },
      );
    }

    return qb.getMany();
  }

  async findOne(product_id: string): Promise<Catalogue | null> {
    return this.catalogueRepo.findOne({ where: { product_id } });
  }

  async create(dto: CreateCatalogueDto): Promise<Catalogue> {
    const entity = this.catalogueRepo.create({
      ...dto,
      inventory_quantity: dto.inventory_quantity != null ? String(dto.inventory_quantity) : '0',
      fulfilled_by: dto.fulfilled_by ?? 'Fulfilled by Plazza',
    });
    return this.catalogueRepo.save(entity);
  }

  async upsert(dto: CreateCatalogueDto): Promise<Catalogue> {
    // save() performs insert or update on PK
    return this.create(dto);
  }

  async update(product_id: string, dto: UpdateCatalogueDto): Promise<Catalogue> {
    const existing = await this.findOne(product_id);
    if (!existing) {
      return this.create({ ...(dto as CreateCatalogueDto), product_id, dist_item_code: (dto as any).dist_item_code ?? '' });
    }

    // Check if dist_item_code is changing
    const distItemCodeChanged = dto.dist_item_code && dto.dist_item_code !== existing.dist_item_code;
    
    // Check if product_id is provided in the request (to fetch metadata)
    const productIdProvided = dto.product_id;
    
    let updatedDto = { ...dto };
    
    // If product_id is provided, fetch updated metadata from original_all_products
    if (productIdProvided && dto.product_id) {
      try {
        const metadataInfo = await this.fetchMetadataFromMainDB(dto.product_id);
        if (!metadataInfo) {
          throw new BadRequestException(`Product ID '${dto.product_id}' not found in original_all_products. Please upload it first.`);
        }
        updatedDto = {
          ...updatedDto,
          name: metadataInfo.name,
          manufacturers: metadataInfo.manufacturers,
          salt_composition: metadataInfo.salt_composition,
          medicine_type: metadataInfo.medicine_type,
          mrp: metadataInfo.mrp?.toString(),
          prescription_required: metadataInfo.prescription_required,
          package: metadataInfo.package,
          qty: metadataInfo.qty,
          product_form: metadataInfo.product_form,
          image_url: metadataInfo.image_url,
          name_search_words: metadataInfo.name_search_words,
          directions_for_use: metadataInfo.directions_for_use,
          information: metadataInfo.information,
          key_benefits: metadataInfo.key_benefits,
          key_ingredients: metadataInfo.key_ingredients,
          safety_information: metadataInfo.safety_information,
          breadcrumbs: metadataInfo.breadcrumbs,
          country_of_origin: metadataInfo.country_of_origin,
        };
      } catch (error) {
        console.error('Error fetching metadata from main DB:', error);
        throw error; // Re-throw the error to prevent update
      }
    }
    
    // If dist_item_code is changing, fetch updated pricing from ERP database
    if (distItemCodeChanged && this.erpPool && dto.dist_item_code) {
      try {
        const pricingInfo = await this.fetchPricingFromERP(dto.dist_item_code);
        if (!pricingInfo) {
          throw new BadRequestException(`Item code '${dto.dist_item_code}' not found in distributor_master_list. Please upload it first.`);
        }
        updatedDto = {
          ...updatedDto,
          distributor_mrp: pricingInfo.mrp?.toString(),
          plazza_selling_price_incl_gst: pricingInfo.plazza_selling_price_incl_gst?.toString(),
          effective_customer_discount: pricingInfo.effective_customer_discount?.toString(),
        };
      } catch (error) {
        console.error('Error fetching pricing from ERP:', error);
        throw error; // Re-throw the error to prevent update
      }
    }

    // If product_id is provided, fetch metadata from original_all_products and update existing record
    if (productIdProvided && dto.product_id) {
      // The product_id in the URL path remains the same, we just update metadata fields
      // Remove product_id from updatedDto since we're not changing the primary key
      const { product_id, ...metadataUpdateDto } = updatedDto;
      
      const merged = this.catalogueRepo.merge(existing, {
        ...metadataUpdateDto,
        inventory_quantity: metadataUpdateDto.inventory_quantity != null ? String(metadataUpdateDto.inventory_quantity) : existing.inventory_quantity,
      } as any);
      
      return this.catalogueRepo.save(merged);
    }

    // Normal update for non-primary key changes
    const merged = this.catalogueRepo.merge(existing, {
      ...updatedDto,
      inventory_quantity:
        updatedDto.inventory_quantity != null ? String(updatedDto.inventory_quantity) : existing.inventory_quantity,
    } as any);
    return this.catalogueRepo.save(merged);
  }

  async remove(product_id: string): Promise<{ deleted: boolean; message: string }> {
    const result = await this.catalogueRepo.delete({ product_id });
    if (result.affected && result.affected > 0) {
      return { deleted: true, message: 'Product deleted successfully' };
    } else {
      return { deleted: false, message: 'Product not found' };
    }
  }

  async bulkRemove(product_ids: string[]): Promise<{ deleted: number; errors: any[] }> {
    const errors: any[] = [];
    let deletedCount = 0;

    for (const product_id of product_ids) {
      try {
        const result = await this.catalogueRepo.delete({ product_id });
        if (result.affected && result.affected > 0) {
          deletedCount++;
        } else {
          errors.push({ product_id, error: 'Product not found' });
        }
      } catch (e) {
        errors.push({ product_id, error: String(e?.message ?? e) });
      }
    }

    return { deleted: deletedCount, errors };
  }

  async bulkCreate(items: CreateCatalogueDto[]): Promise<{ inserted: number; errors: any[] }> {
    const entities = items.map((dto) =>
      this.catalogueRepo.create({
        ...dto,
        inventory_quantity: dto.inventory_quantity != null ? String(dto.inventory_quantity) : '0',
        fulfilled_by: dto.fulfilled_by ?? 'Fulfilled by Plazza',
      }),
    );
    const errors: any[] = [];
    const saved: Catalogue[] = [];
    for (const entity of entities) {
      try {
        const res = await this.catalogueRepo.save(entity);
        saved.push(res);
      } catch (e) {
        errors.push({ product_id: entity.product_id, error: String(e?.message ?? e) });
      }
    }
    return { inserted: saved.length, errors };
  }

  private async fetchPricingFromERP(itemCode: string): Promise<any> {
    if (!this.erpPool) {
      throw new Error('ERP database connection not available');
    }

    const pricingQuery = `
      SELECT mrp, plazza_selling_price_incl_gst, effective_customer_discount
      FROM distributor_master_list
      WHERE item_code = $1
      LIMIT 1
    `;

    const client = await this.erpPool.connect();
    try {
      const result = await client.query(pricingQuery, [itemCode]);
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    } finally {
      client.release();
    }
  }

  private async fetchMetadataFromMainDB(productId: string): Promise<any> {
    const metadataQuery = `
      SELECT name, manufacturers, salt_composition, medicine_type, mrp, prescription_required, 
             package, qty, product_form, image_url, name_search_words, directions_for_use, 
             information, key_benefits, key_ingredients, safety_information, breadcrumbs, 
             country_of_origin
      FROM original_all_products
      WHERE product_id = $1
      LIMIT 1
    `;

    const result = await this.catalogueRepo.query(metadataQuery, [productId]);
    if (result.length > 0) {
      return result[0];
    }
    return null;
  }
}


