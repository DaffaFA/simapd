import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

import { ViolationsService } from './violations.service';
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
  constructor(private readonly service: ViolationsService) {}

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
  async link(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkViolationDto,
    @CurrentUser() user: User,
  ): Promise<ViolationResponseDto> {
    const linkedViolation = await this.service.linkToPersonnel(id, dto, user.username);
    return this.service.toResponseDto(linkedViolation);
  }

  @Delete(':id/link')
  @Roles('Safety Officer', 'admin')
  @UseGuards(RolesGuard)
  async unlink(@Param('id', ParseUUIDPipe) id: string): Promise<ViolationResponseDto> {
    const unlinkedViolation = await this.service.unlinkPersonnel(id);
    return this.service.toResponseDto(unlinkedViolation);
  }

  @Get(':id/frame')
  async getFrame(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const violation = await this.service.findOne(id);
    if (!violation.frame_path) {
      throw new NotFoundException('Frame path is null');
    }

    // Adjust absolute or relative path resolution as needed based on your setup.
    // For now assuming frame_path is absolute or relative to project root.
    const filePath = path.resolve(violation.frame_path);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Frame file not found on disk');
    }

    res.sendFile(filePath);
  }

  @Delete(':id')
  @Roles('Safety Officer', 'admin')
  @UseGuards(RolesGuard)
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
