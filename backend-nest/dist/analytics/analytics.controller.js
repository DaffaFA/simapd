"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const analytics_service_1 = require("./analytics.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const analytics_query_dto_1 = require("./dto/analytics-query.dto");
let AnalyticsController = class AnalyticsController {
    constructor(service) {
        this.service = service;
    }
    async dashboard(q) {
        const [summary, trend, byType, byShift, offenders] = await Promise.all([
            this.service.getDashboardSummary(),
            this.service.getDailyTrend(q.days),
            this.service.getByType(q.date_from, q.date_to),
            this.service.getByShift(q.date_from, q.date_to),
            this.service.getTopOffenders(q.limit, q.date_from, q.date_to),
        ]);
        return { summary, trend, byType, byShift, offenders };
    }
    async exportCsv(q, res) {
        const csv = await this.service.exportCsv(q);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="laporan_apd_${q.date_from ?? 'all'}.csv"`);
        res.send(Buffer.from('\uFEFF' + csv, 'utf8'));
    }
    async exportPdf(q, res) {
        const from = q.date_from;
        const to = q.date_to;
        const pdf = await this.service.exportPdf(from, to);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="laporan_apd_${to ?? 'all'}.pdf"`);
        res.send(pdf);
    }
    async exportExcel(q, res) {
        const from = q.date_from;
        const to = q.date_to;
        const buffer = await this.service.exportExcel(from, to);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="laporan_apd_${from ?? 'all'}.xlsx"`);
        res.send(buffer);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_query_dto_1.AnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_query_dto_1.AnalyticsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)('export/pdf'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_query_dto_1.AnalyticsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "exportPdf", null);
__decorate([
    (0, common_1.Get)('export/excel'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_query_dto_1.AnalyticsQueryDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "exportExcel", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('Analytics'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map