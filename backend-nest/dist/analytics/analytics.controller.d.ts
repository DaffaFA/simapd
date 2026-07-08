import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
export declare class AnalyticsController {
    private readonly service;
    constructor(service: AnalyticsService);
    dashboard(q: AnalyticsQueryDto): Promise<{
        summary: {
            compliance_rate: number;
            total_violations_today: number;
            total_violations_week: number;
            linked_count: number;
            unlinked_count: number;
            active_sp_count: number;
            sp1_count: number;
            sp2_count: number;
            sp3_count: number;
        };
        trend: {
            date: string;
            total_violations: number;
            compliance_rate: number;
        }[];
        byType: {
            helm: number;
            vest: number;
            shoes: number;
            helm_pct: number;
            vest_pct: number;
            shoes_pct: number;
        };
        byShift: {
            pagi: any;
            siang: any;
            malam: any;
        };
        offenders: {
            personnel_id: any;
            full_name: any;
            employee_id: any;
            role: any;
            violation_count: number;
        }[];
    }>;
    exportCsv(q: AnalyticsQueryDto, res: Response): Promise<void>;
    exportPdf(q: AnalyticsQueryDto, res: Response): Promise<void>;
}
