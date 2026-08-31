import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, HttpCode, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { PersonnelService } from './personnel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PersonnelFilterDto } from './dto/personnel-filter.dto';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { PersonnelResponseDto } from './dto/personnel-response.dto';

@ApiTags('Personnel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('personnel')
export class PersonnelController {
  constructor(private readonly service: PersonnelService) {}

  @Get()
  async findAll(@Query() q: PersonnelFilterDto): Promise<PaginatedResponseDto<PersonnelResponseDto>> {
    const [items, total] = await this.service.findAll(q);
    return PaginatedResponseDto.of(items, total, q.page ?? 1, q.page_size ?? 20);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/export')
  async exportProfile(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const pdf = await this.service.exportProfile(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="profil_karyawan_${id}.pdf"`);
    res.send(pdf);
  }

  @Post()
  @Roles('safety_officer', 'admin')
  @UseGuards(RolesGuard)
  @HttpCode(201)
  async create(@Body() dto: CreatePersonnelDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Roles('safety_officer', 'admin')
  @UseGuards(RolesGuard)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePersonnelDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('safety_officer', 'admin')
  @UseGuards(RolesGuard)
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}
