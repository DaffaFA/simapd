import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SpService } from './sp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IssueSpDto } from './dto/issue-sp.dto';
import { SpConfigUpdateDto } from './dto/sp-config-update.dto';
import { User } from '../auth/entities/user.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@ApiTags('SP Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Safety Officer', 'admin')
@Controller('sp')
export class SpController {
  constructor(private readonly spService: SpService) {}

  @Post('issue')
  @HttpCode(201)
  async issue(@Body() dto: IssueSpDto, @CurrentUser() user: User) {
    return this.spService.issueManual(dto, user.username);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  async revoke(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.spService.revoke(id, user.username);
  }

  @Get('config')
  @Roles() // override roles, semua role yang punya jwt bisa akses
  async getConfig() {
    return this.spService.getConfig();
  }

  @Put('config')
  async updateConfig(@Body() dto: SpConfigUpdateDto, @CurrentUser() user: User) {
    return this.spService.updateConfig(dto, user.username);
  }

  @Get('active')
  async getActive(
    @Query('page') page: string = '1',
    @Query('page_size') pageSize: string = '20',
  ) {
    const p = parseInt(page, 10);
    const ps = parseInt(pageSize, 10);
    const [items, total] = await this.spService.findActiveAll(p, ps);
    return PaginatedResponseDto.of(items, total, p, ps);
  }

  @Get()
  @Roles() // Allow any authenticated user
  async findAll(@Query('personnel_id') personnelId?: string) {
    return this.spService.findAll(personnelId);
  }
}
