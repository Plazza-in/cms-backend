import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, SubCategory, UseCase } from './taxonomy.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
  CreateUseCaseDto,
  UpdateUseCaseDto,
} from './dto';

@Injectable()
export class TaxonomyService {
  constructor(
    @InjectRepository(Category) private readonly categoriesRepo: Repository<Category>,
    @InjectRepository(SubCategory) private readonly subCategoriesRepo: Repository<SubCategory>,
    @InjectRepository(UseCase) private readonly useCasesRepo: Repository<UseCase>,
  ) {}

  // Categories
  findAllCategories() {
    return this.categoriesRepo.find({ order: { rank:'ASC' } });
  }

  findCategoryById(id: string) {
    return this.categoriesRepo.findOne({ where: { id } });
  }

  async createCategory(dto: CreateCategoryDto) {
    // Upsert by unique code
    if (dto.code) {
      const existingByCode = await this.categoriesRepo.findOne({ where: { code: dto.code } });
      if (existingByCode) {
        Object.assign(existingByCode, dto);
        return await this.categoriesRepo.save(existingByCode);
      }
    }
    const entity = this.categoriesRepo.create(dto);
    return await this.categoriesRepo.save(entity);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const existing = await this.findCategoryById(id);
    if (!existing) throw new NotFoundException('Category not found');
    Object.assign(existing, dto);
    return await this.categoriesRepo.save(existing);
  }

  async deleteCategory(id: string) {
    const res = await this.categoriesRepo.delete({ id });
    if (!res.affected) throw new NotFoundException('Category not found');
    return { success: true } as const;
  }

  // SubCategories
  findAllSubCategories() {
    return this.subCategoriesRepo.find({ order: { rank:'ASC' } });
  }

  findSubCategoryById(id: string) {
    return this.subCategoriesRepo.findOne({ where: { id } });
  }

  findSubCategoriesByUseCase(l2_id: string) {
    return this.subCategoriesRepo.find({ where: { l2_id }, order: { rank:'ASC' } });
  }

  async createSubCategory(dto: CreateSubCategoryDto) {
    if (dto.code) {
      const existingByCode = await this.subCategoriesRepo.findOne({ where: { code: dto.code } });
      if (existingByCode) {
        Object.assign(existingByCode, dto);
        return await this.subCategoriesRepo.save(existingByCode);
      }
    }
    const entity = this.subCategoriesRepo.create(dto);
    return await this.subCategoriesRepo.save(entity);
  }

  async updateSubCategory(id: string, dto: UpdateSubCategoryDto) {
    const existing = await this.findSubCategoryById(id);
    if (!existing) throw new NotFoundException('Sub-category not found');
    if (dto.code && dto.code !== existing.code) {
      const clash = await this.subCategoriesRepo.findOne({ where: { code: dto.code } });
      if (clash && clash.id !== id) throw new ConflictException('Sub-category code already exists');
    }
    Object.assign(existing, dto);
    return await this.subCategoriesRepo.save(existing);
  }

  async deleteSubCategory(id: string) {
    const res = await this.subCategoriesRepo.delete({ id });
    if (!res.affected) throw new NotFoundException('Sub-category not found');
    return { success: true } as const;
  }

  // UseCases
  findAllUseCases() {
    return this.useCasesRepo.find({ order: { rank:'ASC' } });
  }

  findUseCaseById(id: string) {
    return this.useCasesRepo.findOne({ where: { id } });
  }

  findUseCasesByCategory(l1_id: string) {
    return this.useCasesRepo.find({ where: { l1_id }, order: { rank:'ASC' } });
  }

  async createUseCase(dto: CreateUseCaseDto) {
    if (dto.code) {
      const existingByCode = await this.useCasesRepo.findOne({ where: { code: dto.code } });
      if (existingByCode) {
        Object.assign(existingByCode, dto);
        return await this.useCasesRepo.save(existingByCode);
      }
    }
    const entity = this.useCasesRepo.create(dto);
    return await this.useCasesRepo.save(entity);
  }

  async updateUseCase(id: string, dto: UpdateUseCaseDto) {
    const existing = await this.findUseCaseById(id);
    if (!existing) throw new NotFoundException('Use case not found');
    if (dto.code && dto.code !== existing.code) {
      const clash = await this.useCasesRepo.findOne({ where: { code: dto.code } });
      if (clash && clash.id !== id) throw new ConflictException('Use case code already exists');
    }
    Object.assign(existing, dto);
    return await this.useCasesRepo.save(existing);
  }

  async deleteUseCase(id: string) {
    const res = await this.useCasesRepo.delete({ id });
    if (!res.affected) throw new NotFoundException('Use case not found');
    return { success: true } as const;
  }
}


