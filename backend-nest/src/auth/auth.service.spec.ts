import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService, JwtService,
        { provide: getRepositoryToken(User), useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
        }},
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') }},
      ],
    }).compile()
    service = module.get<AuthService>(AuthService)
  })

  it('returns null for wrong password', async () => {
    const mockUser = { id:'1', username:'admin', hashed_password:'hash', is_active:true }
    jest.spyOn(service['userRepo'],'findOne').mockResolvedValue(mockUser as User)
    jest.spyOn(bcrypt,'compare').mockResolvedValue(false as never)
    expect(await service.validateUser('admin','wrong')).toBeNull()
  })

  it('returns user for correct credentials', async () => {
    const mockUser = { id:'1', username:'admin', hashed_password:'hash', is_active:true }
    jest.spyOn(service['userRepo'],'findOne').mockResolvedValue(mockUser as User)
    jest.spyOn(service['userRepo'],'save').mockResolvedValue(mockUser as User)
    jest.spyOn(bcrypt,'compare').mockResolvedValue(true as never)
    const result = await service.validateUser('admin','admin123')
    expect(result?.username).toBe('admin')
  })
})
