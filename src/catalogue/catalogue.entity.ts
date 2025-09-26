import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'catalogue' })
export class Catalogue {
  @PrimaryColumn({ name: 'product_id', type: 'varchar' })
  product_id: string;

  @Column({ name: 'dist_item_code', type: 'varchar' })
  dist_item_code: string;

  @Column({ name: 'name', type: 'varchar', nullable: true })
  name?: string | null;

  @Column({ name: 'manufacturers', type: 'varchar', nullable: true })
  manufacturers?: string | null;

  @Column({ name: 'salt_composition', type: 'text', nullable: true })
  salt_composition?: string | null;

  @Column({ name: 'medicine_type', type: 'varchar', nullable: true })
  medicine_type?: string | null;

  @Column({ name: 'c1', type: 'jsonb', nullable: true })
  c1?: Record<string, unknown> | null;

  @Column({ name: 'c2', type: 'jsonb', nullable: true })
  c2?: Record<string, unknown> | null;

  @Column({ name: 'c3', type: 'jsonb', nullable: true })
  c3?: Record<string, unknown> | null;

  @Column({ name: 'c4', type: 'jsonb', nullable: true })
  c4?: Record<string, unknown> | null;

  @Column({ name: 'c5', type: 'jsonb', nullable: true })
  c5?: Record<string, unknown> | null;

  @Column({ name: 'introduction', type: 'text', nullable: true })
  introduction?: string | null;

  @Column({ name: 'benefits', type: 'text', nullable: true })
  benefits?: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'how_to_use', type: 'text', nullable: true })
  how_to_use?: string | null;

  @Column({ name: 'safety_advise', type: 'text', nullable: true })
  safety_advise?: string | null;

  @Column({ name: 'if_miss', type: 'text', nullable: true })
  if_miss?: string | null;

  @Column({ name: 'packaging_detail', type: 'text', nullable: true })
  packaging_detail?: string | null;

  @Column({ name: 'package', type: 'varchar', nullable: true })
  package?: string | null;

  @Column({ name: 'qty', type: 'varchar', nullable: true })
  qty?: string | null;

  @Column({ name: 'product_form', type: 'varchar', nullable: true })
  product_form?: string | null;

  @Column({ name: 'mrp', type: 'numeric', nullable: true })
  mrp?: string | null;

  @Column({ name: 'prescription_required', type: 'boolean', nullable: true })
  prescription_required?: boolean | null;

  @Column({ name: 'fact_box', type: 'text', nullable: true })
  fact_box?: string | null;

  @Column({ name: 'primary_use', type: 'text', nullable: true })
  primary_use?: string | null;

  @Column({ name: 'storage', type: 'text', nullable: true })
  storage?: string | null;

  @Column({ name: 'use_of', type: 'text', nullable: true })
  use_of?: string | null;

  @Column({ name: 'common_side_effect', type: 'text', nullable: true })
  common_side_effect?: string | null;

  @Column({ name: 'alcohol_interaction', type: 'text', nullable: true })
  alcohol_interaction?: string | null;

  @Column({ name: 'pregnancy_interaction', type: 'text', nullable: true })
  pregnancy_interaction?: string | null;

  @Column({ name: 'lactation_interaction', type: 'text', nullable: true })
  lactation_interaction?: string | null;

  @Column({ name: 'driving_interaction', type: 'text', nullable: true })
  driving_interaction?: string | null;

  @Column({ name: 'kidney_interaction', type: 'text', nullable: true })
  kidney_interaction?: string | null;

  @Column({ name: 'liver_interaction', type: 'text', nullable: true })
  liver_interaction?: string | null;

  @Column({ name: 'manufacturer_address', type: 'text', nullable: true })
  manufacturer_address?: string | null;

  @Column({ name: 'q_a', type: 'text', nullable: true })
  q_a?: string | null;

  @Column({ name: 'how_it_works', type: 'text', nullable: true })
  how_it_works?: string | null;

  @Column({ name: 'interaction', type: 'text', nullable: true })
  interaction?: string | null;

  @Column({ name: 'manufacturer_details', type: 'text', nullable: true })
  manufacturer_details?: string | null;

  @Column({ name: 'marketer_details', type: 'text', nullable: true })
  marketer_details?: string | null;

  @Column({ name: 'reference', type: 'text', nullable: true })
  reference?: string | null;

  @Column({ name: 'normalized_name', type: 'text', nullable: true })
  normalized_name?: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  updated_at?: Date | null;

  @Column('text', { name: 'image_url', array: true, nullable: true })
  image_url?: string[] | null;

  @Column({ name: 'distributor_mrp', type: 'numeric', nullable: true })
  distributor_mrp?: string | null;

  @Column({ name: 'plazza_selling_price_incl_gst', type: 'numeric', nullable: true })
  plazza_selling_price_incl_gst?: string | null;

  @Column({ name: 'effective_customer_discount', type: 'numeric', nullable: true })
  effective_customer_discount?: string | null;

  @Column({ name: 'distributor', type: 'varchar', nullable: true })
  distributor?: string | null;

  @Column({ name: 'plazza_price_pack', type: 'varchar', nullable: true })
  plazza_price_pack?: string | null;

  @Column({ name: 'fulfilled_by', type: 'varchar', nullable: true, default: () => "'Fulfilled by Plazza'" })
  fulfilled_by?: string | null;

  @Column('text', { name: 'name_search_words', array: true, nullable: true })
  name_search_words?: string[] | null;

  @Column({ name: 'directions_for_use', type: 'text', nullable: true })
  directions_for_use?: string | null;

  @Column({ name: 'information', type: 'text', nullable: true })
  information?: string | null;

  @Column({ name: 'key_benefits', type: 'text', nullable: true })
  key_benefits?: string | null;

  @Column({ name: 'key_ingredients', type: 'text', nullable: true })
  key_ingredients?: string | null;

  @Column({ name: 'safety_information', type: 'text', nullable: true })
  safety_information?: string | null;

  @Column({ name: 'breadcrumbs', type: 'text', nullable: true })
  breadcrumbs?: string | null;

  @Column({ name: 'country_of_origin', type: 'text', nullable: true })
  country_of_origin?: string | null;

  @Column('text', { name: 'location', array: true, nullable: true })
  location?: string[] | null;

  @Column({ name: 'inventory_quantity', type: 'bigint', default: () => '0' })
  inventory_quantity: string;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  created_at?: Date | null;

  @Column({ name: 'product_category_name', type: 'varchar', nullable: true })
  product_category_name?: string | null;

  @Column({ name: 'product_category_id', type: 'varchar', nullable: true })
  product_category_id?: string | null;

  @Column({ name: 'product_use_case_name', type: 'varchar', nullable: true })
  product_use_case_name?: string | null;

  @Column({ name: 'product_use_case_id', type: 'varchar', nullable: true })
  product_use_case_id?: string | null;

  @Column({ name: 'product_sub_category_id', type: 'varchar', nullable: true })
  product_sub_category_id?: string | null;

  @Column({ name: 'product_sub_category_name', type: 'varchar', nullable: true })
  product_sub_category_name?: string | null;

  @Column({ name: 'gst_rate', type: 'numeric', nullable: true })
  gst_rate?: string | null;

  @Column({ name: 'hsn_code', type: 'varchar', nullable: true })
  hsn_code?: string | null;

  @Column({ name: 'rank', type: 'int', nullable: true })
  rank?: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: () => 'false' })
  is_active: boolean;

  @Column({ name: 'deferred_allowed', type: 'boolean', default: () => 'false' })
  deferred_allowed: boolean;
}


