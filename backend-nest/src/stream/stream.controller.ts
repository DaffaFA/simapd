import { Controller, Get, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
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
      active_connections: this.gateway.getConnectionCount(),
      server_time: new Date().toISOString()
    }
  }

  @Get('inject-test')
  @UseGuards(JwtAuthGuard)
  async injectTestFrame(@Res() res: Response) {
    const tinyRedJpeg =
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
      'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
      'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
      'MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIhAA' +
      'AgIBBQEBAAAAAAAAAAAAAQIDBAURBhITFP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEA' +
      'AAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDKtWrVq//Z'

    const testMsg = {
      event:      'frame',
      camera_id:  'TEST-INJECT',
      frame_b64:  tinyRedJpeg,
      width:      1,
      height:     1,
      detections: [{
        track_id:     99,
        bbox:         [0, 0, 100, 200],
        helm_color:   'Kuning',
        role_label:   'Pekerja',
        is_compliant: false,
        missing_ppe:  ['helm'],
      }],
      timestamp:  new Date().toISOString(),
    }

    this.gateway.broadcast(testMsg)

    return res.json({
      ok:      true,
      message: 'Test frame dikirim ke semua WS clients',
      clients: this.gateway.getConnectionCount(),
    })
  }
}
