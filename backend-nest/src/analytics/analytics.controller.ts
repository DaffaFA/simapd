import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('Analytics') 
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard) 
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  async dashboard(@Query() q: AnalyticsQueryDto) {
    const [summary, trend, byType, byShift, offenders] = await Promise.all([
      this.service.getDashboardSummary(),
      this.service.getDailyTrend(q.days),
      this.service.getByType(q.date_from, q.date_to),
      this.service.getByShift(q.date_from, q.date_to),
      this.service.getTopOffenders(q.limit, q.date_from, q.date_to),
    ]);
    return { summary, trend, byType, byShift, offenders };
  }

  @Get('export/csv')
  async exportCsv(@Query() q: AnalyticsQueryDto, @Res() res: Response) {
    const csv = await this.service.exportCsv(q);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="violations_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send('\uFEFF' + csv);   // BOM untuk Excel compatibility
  }

  @Get('export/pdf')
  async exportPdf(@Query() q: AnalyticsQueryDto, @Res() res: Response) {
    const from = q.date_from ?? new Date(Date.now()-30*86400000).toISOString().slice(0,10);
    const to   = q.date_to ?? new Date().toISOString().slice(0,10);
    const pdf  = await this.service.exportPdf(from, to);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="laporan_apd_${to}.pdf"`);
    res.send(pdf);
  }
}
