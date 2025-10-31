import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateSubCategoryDto,
  UpdateSubCategoryDto,
  CreateUseCaseDto,
  UpdateUseCaseDto,
} from './dto';

@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly service: TaxonomyService) {}

  // Categories
  @Get('categories')
  getCategories() {
    return this.service.findAllCategories();
  }

  @Get('categories/:id')
  getCategory(@Param('id') id: string) {
    return this.service.findCategoryById(id);
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Put('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }

  // Sub-categories
  @Get('sub-categories')
  getSubCategories(@Query('l2_id') l2_id?: string) {
    if (l2_id) return this.service.findSubCategoriesByUseCase(l2_id);
    return this.service.findAllSubCategories();
  }

  @Get('sub-categories/:id')
  getSubCategory(@Param('id') id: string) {
    return this.service.findSubCategoryById(id);
  }

  @Post('sub-categories')
  createSubCategory(@Body() dto: CreateSubCategoryDto) {
    return this.service.createSubCategory(dto);
  }

  @Put('sub-categories/:id')
  updateSubCategory(@Param('id') id: string, @Body() dto: UpdateSubCategoryDto) {
    return this.service.updateSubCategory(id, dto);
  }

  @Delete('sub-categories/:id')
  deleteSubCategory(@Param('id') id: string) {
    return this.service.deleteSubCategory(id);
  }

  // Use-cases
  @Get('use-cases')
  getUseCases(@Query('l1_id') l1_id?: string) {
    if (l1_id) return this.service.findUseCasesByCategory(l1_id);
    return this.service.findAllUseCases();
  }

  @Get('use-cases/:id')
  getUseCase(@Param('id') id: string) {
    return this.service.findUseCaseById(id);
  }

  @Post('use-cases')
  createUseCase(@Body() dto: CreateUseCaseDto) {
    return this.service.createUseCase(dto);
  }

  @Put('use-cases/:id')
  updateUseCase(@Param('id') id: string, @Body() dto: UpdateUseCaseDto) {
    return this.service.updateUseCase(id, dto);
  }

  @Delete('use-cases/:id')
  deleteUseCase(@Param('id') id: string) {
    return this.service.deleteUseCase(id);
  }
}


