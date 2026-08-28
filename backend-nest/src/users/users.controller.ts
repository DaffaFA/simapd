import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseUUIDPipe, HttpCode, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    if (id === user.id) throw new ForbiddenException('Tidak bisa menonaktifkan akun sendiri');
    return this.service.softDelete(id);
  }
}
