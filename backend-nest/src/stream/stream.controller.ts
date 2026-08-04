import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Res, ParseUUIDPipe, HttpCode, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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
    return this.cameraRepo.find({ order: { created_at: 'DESC' } });
  }

  @Post('cameras')
  @UseGuards(RolesGuard)
  @Roles('Safety Officer', 'admin')
  @HttpCode(201)
  async createCamera(@Body() dto: Partial<Camera>): Promise<Camera> {
    return this.cameraRepo.save(this.cameraRepo.create(dto));
  }

  @Patch('cameras/:id')
  @UseGuards(RolesGuard)
  @Roles('Safety Officer', 'admin')
  async updateCamera(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<Camera>,
  ): Promise<Camera> {
    const cam = await this.cameraRepo.findOne({ where: { id } });
    if (!cam) throw new NotFoundException('Kamera tidak ditemukan');
    Object.assign(cam, dto);
    return this.cameraRepo.save(cam);
  }

  @Delete('cameras/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(204)
  async deleteCamera(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const result = await this.cameraRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Kamera tidak ditemukan');
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

