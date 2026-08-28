import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../auth/entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.repo.find({ order: { username: 'ASC' } });
    return users.map(u => this.toDto(u));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Akun tidak ditemukan');
    return this.toDto(u);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    await this.assertUnique(dto.username, dto.email);
    const hashed_password = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({
      username: dto.username,
      email: dto.email,
      full_name: dto.full_name,
      role: dto.role,
      hashed_password,
    });
    return this.toDto(await this.repo.save(user));
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Akun tidak ditemukan');

    if (dto.username || dto.email) {
      await this.assertUnique(dto.username ?? u.username, dto.email ?? u.email, id);
    }

    const { password, ...rest } = dto;
    Object.assign(u, rest);
    if (password) u.hashed_password = await bcrypt.hash(password, 10);

    return this.toDto(await this.repo.save(u));
  }

  async softDelete(id: string): Promise<void> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Akun tidak ditemukan');
    u.is_active = false;
    await this.repo.save(u);
  }

  private async assertUnique(username: string, email: string, excludeId?: string): Promise<void> {
    const existing = await this.repo.findOne({ where: [{ username }, { email }] });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Username atau email sudah terdaftar');
    }
  }

  private toDto(u: User): UserResponseDto {
    const { hashed_password: _hashed_password, ...rest } = u;
    return rest;
  }
}
