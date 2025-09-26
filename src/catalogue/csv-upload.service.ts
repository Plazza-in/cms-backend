import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Catalogue } from './catalogue.entity';
import { CreateCatalogueDto } from './dto/create-catalogue.dto';
import { UploadCsvDto } from './dto/upload-csv.dto';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { Pool } from 'pg';

interface MetadataResult {
  product_id: string;
  name?: string;
  manufacturers?: string;
  salt_composition?: string;
  medicine_type?: string;
  introduction?: string;
  benefits?: string;
  description?: string;
  how_to_use?: string;
  safety_advise?: string;
  if_miss?: string;
  packaging_detail?: string;
  package?: string;
  qty?: string;
  product_form?: string;
  mrp?: string;
  prescription_required?: boolean;
  fact_box?: string;
  primary_use?: string;
  storage?: string;
  use_of?: string;
  common_side_effect?: string;
  alcohol_interaction?: string;
  pregnancy_interaction?: string;
  lactation_interaction?: string;
  driving_interaction?: string;
  kidney_interaction?: string;
  liver_interaction?: string;
  manufacturer_address?: string;
  q_a?: string;
  how_it_works?: string;
  interaction?: string;
  manufacturer_details?: string;
  marketer_details?: string;
  reference?: string;
  normalized_name?: string;
  image_url?: string[];
  distributor_mrp?: number;
  plazza_selling_price_incl_gst?: number;
  effective_customer_discount?: number;
  distributor?: string;
  plazza_price_pack?: string;
  fulfilled_by?: string;
  name_search_words?: string[];
  directions_for_use?: string;
  information?: string;
  key_benefits?: string;
  key_ingredients?: string;
  safety_information?: string;
  breadcrumbs?: string;
  country_of_origin?: string;
}

interface PricingResult {
  item_code: string;
  product_name?: string;
  manufacturer?: string;
  mrp?: number;
  purchase_rate?: number;
  gst_rate?: number;
  plazza_selling_price_incl_gst?: number;
  effective_customer_discount?: number;
  distributor?: string;
  hsn_code?: string;
  original_item_code?: string;
}

@Injectable()
export class CsvUploadService {
  private erpPool: Pool;

  constructor(
    @InjectRepository(Catalogue)
    private readonly catalogueRepo: Repository<Catalogue>,
    private readonly configService: ConfigService,
  ) {
    // Initialize ERP database connection
    this.initializeErpConnection();
  }

  private initializeErpConnection() {
    const erpConfig = this.configService.get('erpDatabase');
    if (erpConfig?.enable) {
      this.erpPool = new Pool({
        connectionString: erpConfig.url,
        ssl: erpConfig.sslCertPath ? {
          rejectUnauthorized: true,
          ca: require('fs').readFileSync(erpConfig.sslCertPath).toString()
        } : undefined,
      });
    }
  }

  async uploadCsv(buffer: Buffer): Promise<{
    total_rows: number;
    successful_inserts: number;
    validation_failures: number;
    duplicate_failures: number;
    existing_products: number;
    skipped_no_metadata: number;
    skipped_no_pricing: number;
    errors: any[];
    skipped_csv: string;
  }> {
    const results = {
      total_rows: 0,
      successful_inserts: 0,
      validation_failures: 0,
      duplicate_failures: 0,
      existing_products: 0,
      skipped_no_metadata: 0,
      skipped_no_pricing: 0,
      errors: [] as any[],
      skipped_csv: '',
    };

    const skippedRows: Array<{
      product_id: string;
      item_code: string;
      reason: string;
      error_timestamp: string;
    }> = [];

    try {
      // Parse CSV
      const csvData = await this.parseCsv(buffer);
      results.total_rows = csvData.length;

      if (csvData.length === 0) {
        results.errors.push('CSV file is empty');
        return results;
      }

      // Check for duplicates in CSV
      const duplicates = this.checkDuplicates(csvData);
      if (duplicates.length > 0) {
        results.duplicate_failures = duplicates.length;
        results.errors.push(`Found duplicate product IDs: ${[...new Set(duplicates)]}`);
        
        // Add duplicate rows to skipped list
        const seen = new Set();
        csvData.forEach(row => {
          if (seen.has(row.product_id)) {
            skippedRows.push({
              product_id: row.product_id,
              item_code: row.item_code,
              reason: 'Duplicate product_id in CSV',
              error_timestamp: new Date().toISOString(),
            });
          } else {
            seen.add(row.product_id);
          }
        });
        
        // Remove duplicates, keeping first occurrence
        const filteredData = csvData.filter(row => {
          if (seen.has(row.product_id)) {
            const isFirst = !skippedRows.some(skipped => 
              skipped.product_id === row.product_id && skipped.reason === 'Duplicate product_id in CSV'
            );
            return isFirst;
          }
          return true;
        });
        csvData.length = 0;
        csvData.push(...filteredData);
      }

      // Check existing products
      const productIds = csvData.map(row => row.product_id);
      const existing = await this.checkExistingProducts(productIds);
      if (existing.length > 0) {
        results.existing_products = existing.length;
        
        // Add existing products to skipped list
        csvData.forEach(row => {
          if (existing.includes(row.product_id)) {
            skippedRows.push({
              product_id: row.product_id,
              item_code: row.item_code,
              reason: 'Product already exists in catalogue',
              error_timestamp: new Date().toISOString(),
            });
          }
        });
        
        // Remove existing products
        const filteredData = csvData.filter(row => !existing.includes(row.product_id));
        csvData.length = 0;
        csvData.push(...filteredData);
      }

      // Process in batches
      const batchSize = 50;
      for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize);
        const batchResult = await this.processBatch(batch, skippedRows);
        
        results.successful_inserts += batchResult.successful_inserts;
        results.validation_failures += batchResult.validation_failures;
        results.skipped_no_metadata += batchResult.skipped_no_metadata;
        results.skipped_no_pricing += batchResult.skipped_no_pricing;
        results.errors.push(...batchResult.errors);
      }

      // Generate CSV for skipped rows
      results.skipped_csv = this.generateSkippedCsv(skippedRows);

      return results;
    } catch (error) {
      results.errors.push(`Critical error: ${error.message}`);
      return results;
    }
  }

  private async parseCsv(buffer: Buffer): Promise<UploadCsvDto[]> {
    return new Promise((resolve, reject) => {
      const results: UploadCsvDto[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csv())
        .on('data', (data: any) => {
          // Validate required fields
          if (data.product_id && data.item_code) {
            results.push({
              product_id: data.product_id.trim(),
              item_code: data.item_code.trim(),
              'Store Inventory': data['Store Inventory'],
              'Location': data['Location'],
            });
          }
        })
        .on('end', () => resolve(results))
        .on('error', (error: any) => reject(error));
    });
  }

  private checkDuplicates(csvData: UploadCsvDto[]): string[] {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    
    for (const row of csvData) {
      if (seen.has(row.product_id)) {
        duplicates.push(row.product_id);
      } else {
        seen.add(row.product_id);
      }
    }
    
    return duplicates;
  }

  private async checkExistingProducts(productIds: string[]): Promise<string[]> {
    const query = `
      SELECT product_id FROM catalogue 
      WHERE product_id = ANY($1)
    `;
    
    const result = await this.catalogueRepo.query(query, [productIds]);
    return result.map((row: any) => row.product_id);
  }

  private async processBatch(batch: UploadCsvDto[], skippedRows: Array<{
    product_id: string;
    item_code: string;
    reason: string;
    error_timestamp: string;
  }>): Promise<{
    successful_inserts: number;
    validation_failures: number;
    skipped_no_metadata: number;
    skipped_no_pricing: number;
    errors: any[];
  }> {
    const result = {
      successful_inserts: 0,
      validation_failures: 0,
      skipped_no_metadata: 0,
      skipped_no_pricing: 0,
      errors: [] as any[],
    };

    try {
      // Extract product IDs and item codes for batch fetching
      const productIds = batch.map(row => row.product_id);
      const itemCodes = batch.map(row => row.item_code);

      // Fetch metadata and pricing data
      const metadata = await this.getMetadataBatch(productIds);
      const pricingData = await this.getPricingBatch(itemCodes);

      // Process each row
      const validData: CreateCatalogueDto[] = [];
      
      for (const row of batch) {
        const collated = await this.collateRowData(row, metadata, pricingData);
        
        if (collated.success && collated.data) {
          validData.push(collated.data);
        } else {
          result.validation_failures++;
          let reason = 'Validation failure';
          
          if (collated.errorType === 'no_metadata') {
            result.skipped_no_metadata++;
            reason = 'No metadata found in original_all_products';
          } else if (collated.errorType === 'no_pricing') {
            result.skipped_no_pricing++;
            reason = 'No pricing data found in distributor_master_list';
          }
          
          // Add to skipped rows
          skippedRows.push({
            product_id: row.product_id,
            item_code: row.item_code,
            reason: reason,
            error_timestamp: new Date().toISOString(),
          });
          
          result.errors.push({
            product_id: row.product_id,
            item_code: row.item_code,
            error: collated.error,
          });
        }
      }

      // Bulk insert valid data
      if (validData.length > 0) {
        const insertResult = await this.bulkCreate(validData);
        result.successful_inserts = insertResult.inserted;
        result.errors.push(...insertResult.errors);
      }

      return result;
    } catch (error) {
      result.errors.push(`Batch processing error: ${error.message}`);
      return result;
    }
  }

  private async getMetadataBatch(productIds: string[]): Promise<Record<string, MetadataResult>> {
    const query = `
      SELECT product_id, name, manufacturers, salt_composition, medicine_type,
             introduction, benefits, description, how_to_use, safety_advise,
             if_miss, packaging_detail, package, qty, product_form, mrp,
             prescription_required, fact_box, primary_use, storage, use_of,
             common_side_effect, alcohol_interaction, pregnancy_interaction,
             lactation_interaction, driving_interaction, kidney_interaction,
             liver_interaction, manufacturer_address, q_a, how_it_works,
             interaction, manufacturer_details, marketer_details, reference,
             normalized_name, image_url, distributor_mrp, plazza_selling_price_incl_gst,
             effective_customer_discount, distributor, plazza_price_pack,
             fulfilled_by, name_search_words, directions_for_use, information,
             key_benefits, key_ingredients, safety_information, breadcrumbs,
             country_of_origin
      FROM original_all_products
      WHERE product_id = ANY($1)
    `;

    const results = await this.catalogueRepo.query(query, [productIds]);
    const metadata: Record<string, MetadataResult> = {};
    
    for (const row of results) {
      metadata[row.product_id] = row;
    }
    
    return metadata;
  }

  private async getPricingBatch(itemCodes: string[]): Promise<Record<string, PricingResult>> {
    if (!this.erpPool) {
      return {};
    }

    try {
      const query = `
        SELECT item_code, product_name, manufacturer, mrp, purchase_rate, gst_rate,
               plazza_selling_price_incl_gst, effective_customer_discount, distributor,
               hsn_code, original_item_code
        FROM distributor_master_list
        WHERE LOWER(item_code) = ANY($1) OR LOWER(original_item_code) = ANY($1)
      `;

      const lowercaseCodes = itemCodes.map(code => code.toLowerCase());
      const client = await this.erpPool.connect();
      
      try {
        const result = await client.query(query, [lowercaseCodes]);
        const pricing: Record<string, PricingResult> = {};
        
        for (const row of result.rows) {
          // Map both item_code and original_item_code variations
          for (const codeField of ['item_code', 'original_item_code']) {
            if (row[codeField]) {
              const originalCode = itemCodes.find(code => 
                code.toLowerCase() === row[codeField].toLowerCase()
              );
              if (originalCode) {
                pricing[originalCode] = row;
              }
            }
          }
        }
        
        return pricing;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error);
      return {};
    }
  }

  private async collateRowData(
    row: UploadCsvDto,
    metadata: Record<string, MetadataResult>,
    pricingData: Record<string, PricingResult>,
  ): Promise<{
    success: boolean;
    data?: CreateCatalogueDto;
    error?: string;
    errorType?: 'no_metadata' | 'no_pricing' | 'validation';
  }> {
    try {
      // Check metadata exists
      const productMetadata = metadata[row.product_id];
      if (!productMetadata) {
        return {
          success: false,
          error: `No metadata found for product_id: ${row.product_id}`,
          errorType: 'no_metadata',
        };
      }

      // Check pricing data exists
      const pricing = pricingData[row.item_code];
      if (!pricing) {
        return {
          success: false,
          error: `No pricing data found for item_code: ${row.item_code}`,
          errorType: 'no_pricing',
        };
      }

      // Process inventory and location
      const inventoryQuantity = this.parseInventoryQuantity(row['Store Inventory']);
      const location = this.parseLocation(row['Location']);

      // Create collated data
      const collatedData: CreateCatalogueDto = {
        product_id: row.product_id,
        dist_item_code: row.item_code,
        name: productMetadata.name,
        manufacturers: productMetadata.manufacturers,
        salt_composition: productMetadata.salt_composition,
        medicine_type: productMetadata.medicine_type,
        introduction: productMetadata.introduction,
        benefits: productMetadata.benefits,
        description: productMetadata.description,
        how_to_use: productMetadata.how_to_use,
        safety_advise: productMetadata.safety_advise,
        if_miss: productMetadata.if_miss,
        packaging_detail: productMetadata.packaging_detail,
        package: productMetadata.package,
        qty: productMetadata.qty,
        product_form: productMetadata.product_form,
        mrp: productMetadata.mrp?.toString(),
        prescription_required: productMetadata.prescription_required,
        fact_box: productMetadata.fact_box,
        primary_use: productMetadata.primary_use,
        storage: productMetadata.storage,
        use_of: productMetadata.use_of,
        common_side_effect: productMetadata.common_side_effect,
        alcohol_interaction: productMetadata.alcohol_interaction,
        pregnancy_interaction: productMetadata.pregnancy_interaction,
        lactation_interaction: productMetadata.lactation_interaction,
        driving_interaction: productMetadata.driving_interaction,
        kidney_interaction: productMetadata.kidney_interaction,
        liver_interaction: productMetadata.liver_interaction,
        manufacturer_address: productMetadata.manufacturer_address,
        q_a: productMetadata.q_a,
        how_it_works: productMetadata.how_it_works,
        interaction: productMetadata.interaction,
        manufacturer_details: productMetadata.manufacturer_details,
        marketer_details: productMetadata.marketer_details,
        reference: productMetadata.reference,
        normalized_name: productMetadata.normalized_name,
        image_url: productMetadata.image_url,
        distributor_mrp: pricing.mrp?.toString(),
        plazza_selling_price_incl_gst: pricing.plazza_selling_price_incl_gst?.toString(),
        effective_customer_discount: pricing.effective_customer_discount?.toString(),
        distributor: pricing.distributor,
        gst_rate: pricing.gst_rate?.toString(),
        hsn_code: pricing.hsn_code,
        plazza_price_pack: productMetadata.plazza_price_pack,
        fulfilled_by: productMetadata.fulfilled_by || 'Fulfilled by Plazza',
        name_search_words: productMetadata.name_search_words,
        directions_for_use: productMetadata.directions_for_use,
        information: productMetadata.information,
        key_benefits: productMetadata.key_benefits,
        key_ingredients: productMetadata.key_ingredients,
        safety_information: productMetadata.safety_information,
        breadcrumbs: productMetadata.breadcrumbs,
        country_of_origin: productMetadata.country_of_origin,
        inventory_quantity: inventoryQuantity,
        location: location,
        is_active: false,
        deferred_allowed: false,
      };

      return { success: true, data: collatedData };
    } catch (error) {
      return {
        success: false,
        error: `Collation error: ${error.message}`,
        errorType: 'validation',
      };
    }
  }

  private parseInventoryQuantity(value: any): number {
    if (!value || value === '' || value === 'nan') return 0;
    try {
      const qty = parseInt(String(value), 10);
      return isNaN(qty) ? 0 : Math.max(0, qty);
    } catch {
      return 0;
    }
  }

  private parseLocation(value: any): string[] | undefined {
    if (!value || value === '' || value === 'nan') return undefined;
    
    try {
      if (Array.isArray(value)) {
        return value.map(v => String(v).trim()).filter(Boolean);
      }
      
      const str = String(value).trim();
      if (str.startsWith('[') && str.endsWith(']')) {
        const parsed = JSON.parse(str);
        return Array.isArray(parsed) ? parsed.map(v => String(v).trim()).filter(Boolean) : undefined;
      }
      
      if (str.includes(',')) {
        return str.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      return [str];
    } catch {
      return undefined;
    }
  }

  private async bulkCreate(items: CreateCatalogueDto[]): Promise<{ inserted: number; errors: any[] }> {
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

  private generateSkippedCsv(skippedRows: Array<{
    product_id: string;
    item_code: string;
    reason: string;
    error_timestamp: string;
  }>): string {
    if (skippedRows.length === 0) {
      return '';
    }

    // CSV header
    const header = 'product_id,item_code,reason,error_timestamp\n';
    
    // CSV rows
    const rows = skippedRows.map(row => 
      `"${row.product_id}","${row.item_code}","${row.reason}","${row.error_timestamp}"`
    ).join('\n');
    
    return header + rows;
  }
}
