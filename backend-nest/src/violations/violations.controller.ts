import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';

import { ViolationsService } from './violations.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

import { ViolationFilterDto } from './dto/violation-filter.dto';
import { LinkViolationDto } from './dto/link-violation.dto';
import { ViolationResponseDto } from './dto/violation-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@ApiTags('Violations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('violations')
export class ViolationsController {
  constructor(
    private readonly service: ViolationsService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async findAll(@Query() f: ViolationFilterDto): Promise<PaginatedResponseDto<ViolationResponseDto>> {
    const [items, total] = await this.service.findAll(f);
    const dtos = items.map(v => this.service.toResponseDto(v));
    return PaginatedResponseDto.of(dtos, total, f.page ?? 1, f.page_size ?? 20);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ViolationResponseDto> {
    const v = await this.service.findOne(id);
    return this.service.toResponseDto(v);
  }

  @Post(':id/link')
  @Roles('Safety Officer', 'admin')
  @UseGuards(RolesGuard)
  async linkToPersonnel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkViolationDto,
    @CurrentUser() user: User,
  ) {
    const links = await this.service.linkToPersonnel(id, dto, user.username);
    return {
      message: `${links.length} orang berhasil di-link ke violation`,
      linked: links.map(l => ({
        id:           l.id,
        personnel_id: l.personnel_id,
        linked_by:    l.linked_by,
        linked_at:    l.linked_at,
      })),
    };
  }

  @Get(':id/links')
  async getViolationLinks(@Param('id', ParseUUIDPipe) id: string) {
    const links = await this.service.getLinksForViolation(id);
    return links.map(l => ({
      id:           l.id,
      personnel_id: l.personnel_id,
      personnel: l.personnel ? {
        id:          l.personnel.id,
        employee_id: l.personnel.employee_id,
        full_name:   l.personnel.full_name,
        role:        l.personnel.role,
        department:  l.personnel.department,
      } : null,
      linked_by: l.linked_by,
      linked_at: l.linked_at,
      notes:     l.notes,
    }));
  }

  @Delete(':id/link/:personnelId')
  @Roles('Safety Officer', 'admin')
  @UseGuards(RolesGuard)
  async unlinkFromPersonnel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('personnelId', ParseUUIDPipe) personnelId: string,
  ) {
    await this.service.unlinkFromPersonnel(id, personnelId);
    return { message: 'Link berhasil dihapus' };
  }

  @Get(':id/frame')
  @UseGuards(JwtAuthGuard)
  async getViolationFrame(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const violation = await this.service.findOne(id)
    if (!violation) throw new NotFoundException('Violation tidak ditemukan')
    
    // Support legacy (file path) atau RustFS (frame_key)
    if (violation.frame_key) {
      const stream = await this.storage.streamObject(violation.frame_key)
      if (!stream) {
        throw new NotFoundException('Frame tidak ditemukan di storage')
      }

      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400') // cache 24 jam
      res.setHeader('Content-Disposition', `inline; filename="violation-${id}.jpg"`)

      try {
        await pipeline(stream as any, res as any)
      } catch (e: any) {
        // Ignore pipeline errors on client disconnect
      }
      return
    }

    if (violation.frame_path) {
      if (!fs.existsSync(violation.frame_path)) {
        throw new NotFoundException('File frame tidak ditemukan di disk')
      }
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Content-Disposition', `inline; filename="violation_${id}.jpg"`)
      fs.createReadStream(violation.frame_path).pipe(res)
      return
    }

    throw new NotFoundException('Frame tidak tersedia untuk violation ini')
  }

  @Post(':id/reject')
  @Roles('Safety Officer', 'admin')
  @UseGuards(RolesGuard)
  async rejectViolation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    const v = await this.service.rejectViolation(id, user.username, reason);
    return this.service.toResponseDto(v);
  }

  @Post(':id/confirm')
  @Roles('Safety Officer', 'admin')
  @UseGuards(RolesGuard)
  async confirmViolation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const v = await this.service.confirmViolation(id, user.username);
    return this.service.toResponseDto(v);
  }

  @Delete(':id')
  @Roles('Safety Officer', 'admin')
  @UseGuards(RolesGuard)
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
