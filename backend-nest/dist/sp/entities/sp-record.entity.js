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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpRecord = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
const personnel_entity_1 = require("../../personnel/entities/personnel.entity");
let SpRecord = class SpRecord extends base_entity_1.BaseEntity {
};
exports.SpRecord = SpRecord;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], SpRecord.prototype, "sp_number", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => personnel_entity_1.Personnel, (p) => p.sp_records),
    (0, typeorm_1.JoinColumn)({ name: 'personnel_id' }),
    __metadata("design:type", personnel_entity_1.Personnel)
], SpRecord.prototype, "personnel", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], SpRecord.prototype, "personnel_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['SP1', 'SP2', 'SP3'] }),
    __metadata("design:type", String)
], SpRecord.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], SpRecord.prototype, "issued_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], SpRecord.prototype, "expires_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], SpRecord.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SpRecord.prototype, "violation_count_at_issuance", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SpRecord.prototype, "issued_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SpRecord.prototype, "revoked_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SpRecord.prototype, "revoked_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SpRecord.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SpRecord.prototype, "trigger_violation_id", void 0);
exports.SpRecord = SpRecord = __decorate([
    (0, typeorm_1.Entity)('sp_records'),
    (0, typeorm_1.Index)(['personnel_id', 'is_active'])
], SpRecord);
//# sourceMappingURL=sp-record.entity.js.map