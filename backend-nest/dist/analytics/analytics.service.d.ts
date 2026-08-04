import { Repository } from 'typeorm';
import { Violation } from '../violations/entities/violation.entity';
import { SpRecord } from '../sp/entities/sp-record.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
export declare class AnalyticsService {
    private violationRepo;
    private spRepo;
    constructor(violationRepo: Repository<Violation>, spRepo: Repository<SpRecord>);
    getDashboardSummary(date?: string): Promise<{
        compliance_rate: number;
        total_violations_today: number;
        total_violations_week: number;
        linked_count: number;
        unlinked_count: number;
        active_sp_count: number;
        sp1_count: number;
        sp2_count: number;
        sp3_count: number;
    }>;
    private _estimateRate;
    getDailyTrend(days?: number): Promise<{
        date: string;
        total_violations: number;
        compliance_rate: number;
    }[]>;
    getByType(dateFrom?: string, dateTo?: string): Promise<{
        helm: number;
        vest: number;
        shoes: number;
        helm_pct: number;
        vest_pct: number;
        shoes_pct: number;
    }>;
    getByShift(dateFrom?: string, dateTo?: string): Promise<{
        pagi: any;
        siang: any;
        malam: any;
    }>;
    getTopOffenders(limit?: number, dateFrom?: string, dateTo?: string): Promise<{
        personnel_id: any;
        full_name: any;
        employee_id: any;
        role: any;
        violation_count: number;
    }[]>;
    exportCsv(filter: AnalyticsQueryDto): Promise<string>;
    private dateWhere;
    exportPdf(dateFrom?: string, dateTo?: string): Promise<Buffer>;
    exportExcel(dateFrom?: string, dateTo?: string): Promise<Buffer>;
    private _generatePdf;
}
