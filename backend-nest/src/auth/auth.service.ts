import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { username, is_active: true } });
    if (!user || !(await bcrypt.compare(password, user.hashed_password))) return null;
    user.last_login = new Date();
    await this.userRepo.save(user);
    return user;
  }

  login(user: User) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      token_type: 'bearer',
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
    };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, is_active: true } });
  }
}
