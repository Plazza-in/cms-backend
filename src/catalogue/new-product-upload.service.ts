import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Catalogue } from './catalogue.entity';
import { CreateCatalogueDto } from './dto/create-catalogue.dto';
import { NewProductMetadataDto } from './dto/new-product-metadata.dto';
import { NewProductDistributorDto } from './dto/new-product-distributor.dto';
import { NewProductMappingDto } from './dto/new-product-mapping.dto';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { Pool } from 'pg';

@Injectable()
export class NewProductUploadService {
  private erpPool: Pool;

  constructor(
    @InjectRepository(Catalogue)
    private readonly catalogueRepo: Repository<Catalogue>,
    private readonly configService: ConfigService,
  ) {
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

  // Calculate pricing based on your Google Sheets formulas
  private calculatePricing(mrp: number, purchaseRate: number, gstRate: number): {
    margin: number;
    effectiveCustomerDiscount: number;
    plazzaSellingPriceInclGst: number;
  } {
    // margin = (H2-I2*(1+K2/100))/(I2*(1+K2/100))
    const purchaseRateWithGst = purchaseRate * (1 + gstRate / 100);
    const margin = (mrp - purchaseRateWithGst) / purchaseRateWithGst;

    // effective_customer_discount = if(L2>0.3,15%,if(L2>0.25,10%,if(L2>0.1,5%,2%)))
    let effectiveCustomerDiscount: number;
    if (margin > 0.3) {
      effectiveCustomerDiscount = 15; // 15%
    } else if (margin > 0.25) {
      effectiveCustomerDiscount = 10; // 10%
    } else if (margin > 0.1) {
      effectiveCustomerDiscount = 5; // 5%
    } else {
      effectiveCustomerDiscount = 2; // 2%
    }

    // plazza_selling_price_incl_gst = round(H2*(1-N2/100),2)
    const plazzaSellingPriceInclGst = Math.round(mrp * (1 - effectiveCustomerDiscount / 100) * 100) / 100;

    return {
      margin,
      effectiveCustomerDiscount,
      plazzaSellingPriceInclGst,
    };
  }

  async uploadMetadataCsv(buffer: Buffer): Promise<{
    total_rows: number;
    successful_inserts: number;
    errors: any[];
  }> {
    const results = {
      total_rows: 0,
      successful_inserts: 0,
      errors: [] as any[],
    };

    try {
      const metadataData = await this.parseMetadataCsv(buffer);
      results.total_rows = metadataData.length;

      if (metadataData.length === 0) {
        results.errors.push('CSV file is empty');
        return results;
      }

      // Insert metadata into original_all_products
      for (const metadata of metadataData) {
        try {
          await this.insertMetadata(metadata);
          results.successful_inserts++;
        } catch (error) {
          results.errors.push({
            product_id: metadata.product_id,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      results.errors.push(`Critical error: ${error.message}`);
      return results;
    }
  }

  async uploadDistributorCsv(buffer: Buffer): Promise<{
    total_rows: number;
    successful_inserts: number;
    errors: any[];
  }> {
    const results = {
      total_rows: 0,
      successful_inserts: 0,
      errors: [] as any[],
    };

    try {
      const distributorData = await this.parseDistributorCsv(buffer);
      results.total_rows = distributorData.length;

      if (distributorData.length === 0) {
        results.errors.push('CSV file is empty');
        return results;
      }

      // Insert distributor data into distributor_master_list
      for (const distributor of distributorData) {
        try {
          await this.insertDistributorData(distributor);
          results.successful_inserts++;
        } catch (error) {
          results.errors.push({
            item_code: distributor.item_code,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      results.errors.push(`Critical error: ${error.message}`);
      return results;
    }
  }

  async uploadMappingCsv(buffer: Buffer): Promise<{
    total_rows: number;
    successful_inserts: number;
    errors: any[];
  }> {
    const results = {
      total_rows: 0,
      successful_inserts: 0,
      errors: [] as any[],
    };

    try {
      const mappingData = await this.parseMappingCsv(buffer);
      results.total_rows = mappingData.length;

      if (mappingData.length === 0) {
        results.errors.push('CSV file is empty');
        return results;
      }

      // Process mapping and insert into catalogue
      for (const mapping of mappingData) {
        try {
          await this.processMapping(mapping);
          results.successful_inserts++;
        } catch (error) {
          results.errors.push({
            product_id: mapping.product_id,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      results.errors.push(`Critical error: ${error.message}`);
      return results;
    }
  }

  private async parseMetadataCsv(buffer: Buffer): Promise<NewProductMetadataDto[]> {
    return new Promise((resolve, reject) => {
      const results: NewProductMetadataDto[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csv())
        .on('data', (data: any) => {
          if (data.product_id && data.name) {
            results.push({
              product_id: data.product_id.trim(),
              name: data.name.trim(),
              manufacturers: data.manufacturers?.trim(),
              salt_composition: data.salt_composition?.trim(),
              medicine_type: data.medicine_type?.trim(),
              introduction: data.introduction?.trim(),
              benefits: data.benefits?.trim(),
              description: data.description?.trim(),
              how_to_use: data.how_to_use?.trim(),
              safety_advise: data.safety_advise?.trim(),
              if_miss: data.if_miss?.trim(),
              packaging_detail: data.packaging_detail?.trim(),
              package: data.package?.trim(),
              qty: data.qty?.trim(),
              product_form: data.product_form?.trim(),
              mrp: data.mrp?.trim(),
              prescription_required: data.prescription_required === 'true' || data.prescription_required === '1',
              fact_box: data.fact_box?.trim(),
              primary_use: data.primary_use?.trim(),
              storage: data.storage?.trim(),
              use_of: data.use_of?.trim(),
              common_side_effect: data.common_side_effect?.trim(),
              alcohol_interaction: data.alcohol_interaction?.trim(),
              pregnancy_interaction: data.pregnancy_interaction?.trim(),
              lactation_interaction: data.lactation_interaction?.trim(),
              driving_interaction: data.driving_interaction?.trim(),
              kidney_interaction: data.kidney_interaction?.trim(),
              liver_interaction: data.liver_interaction?.trim(),
              manufacturer_address: data.manufacturer_address?.trim(),
              q_a: data.q_a?.trim(),
              how_it_works: data.how_it_works?.trim(),
              interaction: data.interaction?.trim(),
              manufacturer_details: data.manufacturer_details?.trim(),
              marketer_details: data.marketer_details?.trim(),
              reference: data.reference?.trim(),
              normalized_name: data.normalized_name?.trim(),
              image_url: data.image_url ? data.image_url.split(',').map((url: string) => url.trim()) : undefined,
              directions_for_use: data.directions_for_use?.trim(),
              information: data.information?.trim(),
              key_benefits: data.key_benefits?.trim(),
              key_ingredients: data.key_ingredients?.trim(),
              safety_information: data.safety_information?.trim(),
              breadcrumbs: data.breadcrumbs?.trim(),
              country_of_origin: data.country_of_origin?.trim(),
              name_search_words: data.name_search_words ? data.name_search_words.split(',').map((word: string) => word.trim()) : undefined,
            });
          }
        })
        .on('end', () => resolve(results))
        .on('error', (error: any) => reject(error));
    });
  }

  private async parseDistributorCsv(buffer: Buffer): Promise<NewProductDistributorDto[]> {
    return new Promise((resolve, reject) => {
      const results: NewProductDistributorDto[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csv())
        .on('data', (data: any) => {
          if (data.product_name && data.item_code && data.mrp && data.purchase_rate && data.gst_rate) {
            const mrp = parseFloat(data.mrp);
            const purchaseRate = parseFloat(data.purchase_rate);
            const gstRate = parseFloat(data.gst_rate);

            const pricing = this.calculatePricing(mrp, purchaseRate, gstRate);

            results.push({
              product_name: data.product_name.trim(),
              manufacturer: data.manufacturer?.trim(),
              normalized_name: data.normalized_name?.trim(),
              item_code: data.item_code.trim(),
              hsn_code: data.hsn_code?.trim(),
              package: data.package?.trim(),
              distributor: data.distributor.trim(),
              mrp: data.mrp.trim(),
              purchase_rate: data.purchase_rate.trim(),
              s: data.s?.trim(),
              gst_rate: data.gst_rate.trim(),
              product_id: data.product_id?.trim(),
              original_item_code: data.original_item_code?.trim(),
              margin: pricing.margin,
              effective_customer_discount: pricing.effectiveCustomerDiscount,
              plazza_selling_price_incl_gst: pricing.plazzaSellingPriceInclGst,
            });
          }
        })
        .on('end', () => resolve(results))
        .on('error', (error: any) => reject(error));
    });
  }

  private async parseMappingCsv(buffer: Buffer): Promise<NewProductMappingDto[]> {
    return new Promise((resolve, reject) => {
      const results: NewProductMappingDto[] = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csv())
        .on('data', (data: any) => {
          if (data.product_id && data.item_code) {
            results.push({
              product_id: data.product_id.trim(),
              item_code: data.item_code.trim(),
              'Store Inventory': data['Store Inventory']?.trim(),
              'Location': data['Location']?.trim(),
              inventory_quantity: data.inventory_quantity ? parseInt(data.inventory_quantity, 10) : undefined,
            });
          }
        })
        .on('end', () => resolve(results))
        .on('error', (error: any) => reject(error));
    });
  }

  private async insertMetadata(metadata: NewProductMetadataDto): Promise<void> {
    const query = `
      INSERT INTO original_all_products (
        product_id, name, manufacturers, salt_composition, medicine_type,
        introduction, benefits, description, how_to_use, safety_advise,
        if_miss, packaging_detail, package, qty, product_form, mrp,
        prescription_required, fact_box, primary_use, storage, use_of,
        common_side_effect, alcohol_interaction, pregnancy_interaction,
        lactation_interaction, driving_interaction, kidney_interaction,
        liver_interaction, manufacturer_address, q_a, how_it_works,
        interaction, manufacturer_details, marketer_details, reference,
        normalized_name, updated_at, image_url, distributor_mrp,
        plazza_selling_price_incl_gst, effective_customer_discount, distributor,
        plazza_price_pack, fulfilled_by, name_search_words, directions_for_use,
        information, key_benefits, key_ingredients, safety_information,
        breadcrumbs, country_of_origin
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35, $36, CURRENT_TIMESTAMP, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51
      )
    `;

    await this.catalogueRepo.query(query, [
      metadata.product_id, metadata.name, metadata.manufacturers, metadata.salt_composition,
      metadata.medicine_type, metadata.introduction, metadata.benefits, metadata.description,
      metadata.how_to_use, metadata.safety_advise, metadata.if_miss, metadata.packaging_detail,
      metadata.package, metadata.qty, metadata.product_form, metadata.mrp,
      metadata.prescription_required, metadata.fact_box, metadata.primary_use, metadata.storage,
      metadata.use_of, metadata.common_side_effect, metadata.alcohol_interaction,
      metadata.pregnancy_interaction, metadata.lactation_interaction, metadata.driving_interaction,
      metadata.kidney_interaction, metadata.liver_interaction, metadata.manufacturer_address,
      metadata.q_a, metadata.how_it_works, metadata.interaction, metadata.manufacturer_details,
      metadata.marketer_details, metadata.reference, metadata.normalized_name,
      metadata.image_url, // image_url
      null, // distributor_mrp
      null, // plazza_selling_price_incl_gst
      null, // effective_customer_discount
      null, // distributor
      null, // plazza_price_pack
      'Fulfilled by partner pharmacy', // fulfilled_by
      metadata.name_search_words, // name_search_words
      metadata.directions_for_use, // directions_for_use
      metadata.information, // information
      metadata.key_benefits, // key_benefits
      metadata.key_ingredients, // key_ingredients
      metadata.safety_information, // safety_information
      metadata.breadcrumbs, // breadcrumbs
      metadata.country_of_origin // country_of_origin
    ]);
  }

  private async insertDistributorData(distributor: NewProductDistributorDto): Promise<void> {
    if (!this.erpPool) {
      throw new Error('ERP database connection not available');
    }

    const query = `
      INSERT INTO distributor_master_list (
        product_name, manufacturer, normalized_name, item_code, hsn_code,
        package, distributor, mrp, purchase_rate, gst_rate, product_id,
        original_item_code, plazza_selling_price_incl_gst, effective_customer_discount,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;

    const client = await this.erpPool.connect();
    try {
      await client.query(query, [
        distributor.product_name, distributor.manufacturer, distributor.normalized_name,
        distributor.item_code, distributor.hsn_code, distributor.package, distributor.distributor,
        distributor.mrp, distributor.purchase_rate, distributor.gst_rate, distributor.product_id,
        distributor.original_item_code, distributor.plazza_selling_price_incl_gst,
        distributor.effective_customer_discount
      ]);
    } finally {
      client.release();
    }
  }

  private async processMapping(mapping: NewProductMappingDto): Promise<void> {
    // Get metadata from original_all_products
    const metadataQuery = `
      SELECT * FROM original_all_products WHERE product_id = $1
    `;
    const metadataResult = await this.catalogueRepo.query(metadataQuery, [mapping.product_id]);
    
    if (metadataResult.length === 0) {
      throw new Error(`Metadata not found for product_id: ${mapping.product_id}`);
    }

    const metadata = metadataResult[0];

    // Get pricing from distributor_master_list (ERP database)
    if (!this.erpPool) {
      throw new Error('ERP database connection not available');
    }

    const pricingQuery = `
      SELECT * FROM distributor_master_list WHERE item_code = $1
    `;
    const client = await this.erpPool.connect();
    let pricingResult;
    try {
      pricingResult = await client.query(pricingQuery, [mapping.item_code]);
    } finally {
      client.release();
    }
    
    if (pricingResult.rows.length === 0) {
      throw new Error(`Pricing data not found for item_code: ${mapping.item_code}`);
    }

    const pricing = pricingResult.rows[0];

    // Process inventory and location
    const inventoryQuantity = mapping.inventory_quantity ?? this.parseInventoryQuantity(mapping['Store Inventory']);
    const location = this.parseLocation(mapping['Location']);

    // Create catalogue entry
    const catalogueData: CreateCatalogueDto = {
      product_id: mapping.product_id,
      dist_item_code: mapping.item_code,
      name: metadata.name,
      manufacturers: metadata.manufacturers,
      salt_composition: metadata.salt_composition,
      medicine_type: metadata.medicine_type,
      introduction: metadata.introduction,
      benefits: metadata.benefits,
      description: metadata.description,
      how_to_use: metadata.how_to_use,
      safety_advise: metadata.safety_advise,
      if_miss: metadata.if_miss,
      packaging_detail: metadata.packaging_detail,
      package: metadata.package,
      qty: metadata.qty,
      product_form: metadata.product_form,
      mrp: metadata.mrp?.toString(),
      prescription_required: metadata.prescription_required,
      fact_box: metadata.fact_box,
      primary_use: metadata.primary_use,
      storage: metadata.storage,
      use_of: metadata.use_of,
      common_side_effect: metadata.common_side_effect,
      alcohol_interaction: metadata.alcohol_interaction,
      pregnancy_interaction: metadata.pregnancy_interaction,
      lactation_interaction: metadata.lactation_interaction,
      driving_interaction: metadata.driving_interaction,
      kidney_interaction: metadata.kidney_interaction,
      liver_interaction: metadata.liver_interaction,
      manufacturer_address: metadata.manufacturer_address,
      q_a: metadata.q_a,
      how_it_works: metadata.how_it_works,
      interaction: metadata.interaction,
      manufacturer_details: metadata.manufacturer_details,
      marketer_details: metadata.marketer_details,
      reference: metadata.reference,
      normalized_name: metadata.normalized_name,
      image_url: metadata.image_url,
      distributor_mrp: pricing.mrp?.toString(),
      plazza_selling_price_incl_gst: pricing.plazza_selling_price_incl_gst?.toString(),
      effective_customer_discount: pricing.effective_customer_discount?.toString(),
      distributor: pricing.distributor,
      gst_rate: pricing.gst_rate?.toString(),
      hsn_code: pricing.hsn_code,
      plazza_price_pack: metadata.plazza_price_pack,
      fulfilled_by: metadata.fulfilled_by || 'Fulfilled by Plazza',
      name_search_words: metadata.name_search_words,
      directions_for_use: metadata.directions_for_use,
      information: metadata.information,
      key_benefits: metadata.key_benefits,
      key_ingredients: metadata.key_ingredients,
      safety_information: metadata.safety_information,
      breadcrumbs: metadata.breadcrumbs,
      country_of_origin: metadata.country_of_origin,
      inventory_quantity: inventoryQuantity,
      location: location,
      is_active: false,
      deferred_allowed: false,
    };

    // Insert into catalogue
    const entity = this.catalogueRepo.create({
      ...catalogueData,
      inventory_quantity: catalogueData.inventory_quantity != null ? String(catalogueData.inventory_quantity) : '0',
      fulfilled_by: catalogueData.fulfilled_by ?? 'Fulfilled by Plazza',
    });

    await this.catalogueRepo.save(entity);
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
}
