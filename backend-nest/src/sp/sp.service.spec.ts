import { Test } from '@nestjs/testing';
import { SpService } from './sp.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SpRecord } from './entities/sp-record.entity';
import { SpConfig } from './entities/sp-config.entity';
import { StorageService } from '../storage/storage.service';

describe('SpService.computeRequiredLevel', () => {
  let service: SpService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SpService,
        { provide: getRepositoryToken(SpRecord), useValue: {} },
        { provide: getRepositoryToken(SpConfig), useValue: {} },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();
    service = module.get<SpService>(SpService);
  });
  
  const cfg = { sp1_threshold:3, sp2_threshold:7, sp3_threshold:12 } as SpConfig

  it('returns null below sp1_threshold', () => {
    expect(service['computeRequiredLevel'](2, cfg)).toBeNull()
  })
  it('returns SP1 at threshold', () => {
    expect(service['computeRequiredLevel'](3, cfg)).toBe('SP1')
  })
  it('returns SP2 at threshold', () => {
    expect(service['computeRequiredLevel'](7, cfg)).toBe('SP2')
  })
  it('returns SP3 at threshold', () => {
    expect(service['computeRequiredLevel'](12, cfg)).toBe('SP3')
  })
  it('returns SP3 above threshold', () => {
    expect(service['computeRequiredLevel'](20, cfg)).toBe('SP3')
  })
})
