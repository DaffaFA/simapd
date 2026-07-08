import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Camera } from './entities/camera.entity';
import { StreamGateway } from './stream.gateway';

@ApiTags('Stream')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stream')
export class StreamController {
  constructor(
    @InjectRepository(Camera) private cameraRepo: Repository<Camera>,
    private gateway: StreamGateway,
  ) {}

  @Get('cameras')
  async getCameras(): Promise<Camera[]> {
    return this.cameraRepo.find({ where: { is_active: true } });
  }

  @Get('status')
  getStatus() {
    return {
      ws_clients: this.gateway.getConnectionCount(),
      timestamp: new Date().toISOString(),
    };
  }
}
