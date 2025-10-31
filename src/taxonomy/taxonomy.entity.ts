import { Column, Entity, Index, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Index('categories_new_code_unique', { unique: true })
  @Column({ name: 'code', type: 'text' })
  code: string;

  @Column({ name: 'title', type: 'text' })
  title: string;

  @Column({ name: 'subtitle', type: 'text', nullable: true })
  subtitle?: string | null;

  @Column({ name: 'thumbnail_icon', type: 'jsonb', nullable: true })
  thumbnail_icon?: Record<string, unknown> | null;

  @Column({ name: 'bg_img', type: 'jsonb', nullable: true })
  bg_img?: Record<string, unknown> | null;

  @Column({ name: 'banner', type: 'json', nullable: true })
  banner?: Record<string, unknown> | null;

  @Column('text', { name: 'top_products', array: true, nullable: true })
  top_products?: string[] | null;

  @Index('idx_categories_rank')
  @Column({ name: 'rank', type: 'int', default: () => '0' })
  rank: number;

  @Column({ name: 'ui_configs', type: 'jsonb', nullable: true })
  ui_configs?: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

@Entity({ name: 'use_cases' })
export class UseCase {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Index('sub_categories_code_unique', { unique: true })
  @Column({ name: 'code', type: 'text' })
  code: string;

  @Index('idx_sub_categories_l1_id')
  @Column({ name: 'l1_id', type: 'uuid' })
  l1_id: string; // FK -> categories.id

  @Column({ name: 'title', type: 'text' })
  title: string;

  @Column({ name: 'subtitle', type: 'text', nullable: true })
  subtitle?: string | null;

  @Column({ name: 'thumbnail_image', type: 'jsonb', nullable: true })
  thumbnail_image?: Record<string, unknown> | null;

  @Column({ name: 'bg_img', type: 'jsonb', nullable: true })
  bg_img?: Record<string, unknown> | null;

  @Column('text', { name: 'product_ids', array: true, nullable: true })
  product_ids?: string[] | null;

  @Column({ name: 'es_query', type: 'jsonb', nullable: true })
  es_query?: Record<string, unknown> | null;

  @Column({ name: 'ui_configs', type: 'jsonb', nullable: true })
  ui_configs?: Record<string, unknown> | null;

  @Column({ name: 'rank', type: 'int', default: () => '0' })
  rank: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}

@Entity({ name: 'sub_categories' })
export class SubCategory {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id: string; // no default in DB, supplied by client

  @Index('sub_categories_new_code_unique', { unique: true })
  @Column({ name: 'code', type: 'text' })
  code: string;

  @Index('idx_sub_categories_l2_id')
  @Column({ name: 'l2_id', type: 'uuid' })
  l2_id: string; // FK -> use_cases.id

  @Column({ name: 'title', type: 'text' })
  title: string;

  @Column({ name: 'subtitle', type: 'text', nullable: true })
  subtitle?: string | null;

  @Column({ name: 'thumbnail_image', type: 'jsonb', nullable: true })
  thumbnail_image?: Record<string, unknown> | null;

  @Column({ name: 'bg_img', type: 'jsonb', nullable: true })
  bg_img?: Record<string, unknown> | null;

  @Column('text', { name: 'product_ids', array: true, nullable: true })
  product_ids?: string[] | null;

  @Column({ name: 'es_query', type: 'jsonb', nullable: true })
  es_query?: Record<string, unknown> | null;

  @Column({ name: 'ui_configs', type: 'jsonb', nullable: true })
  ui_configs?: Record<string, unknown> | null;

  @Index('idx_sub_categories_rank')
  @Column({ name: 'rank', type: 'int' })
  rank: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}


