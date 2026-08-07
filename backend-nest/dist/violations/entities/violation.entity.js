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
exports.Violation = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
const personnel_entity_1 = require("../../personnel/entities/personnel.entity");
const violation_link_entity_1 = require("./violation-link.entity");
let Violation = class Violation extends base_entity_1.BaseEntity {
};
exports.Violation = Violation;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Violation.prototype, "violation_code", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Violation.prototype, "track_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Violation.prototype, "camera_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], Violation.prototype, "detected_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['Pagi', 'Siang', 'Malam'] }),
    __metadata("design:type", String)
], Violation.prototype, "shift", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['Kuning', 'Putih', 'Hijau', 'Unknown'],
        default: 'Unknown',
    }),
    __metadata("design:type", String)
], Violation.prototype, "helm_color_detected", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], Violation.prototype, "role_detected", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Violation.prototype, "missing_helm", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Violation.prototype, "missing_vest", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Violation.prototype, "missing_shoes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'float', default: 0 }),
    __metadata("design:type", Number)
], Violation.prototype, "confidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Violation.prototype, "bbox_x1", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Violation.prototype, "bbox_y1", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Violation.prototype, "bbox_x2", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Violation.prototype, "bbox_y2", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Violation.prototype, "frame_path", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Violation.prototype, "frame_key", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => personnel_entity_1.Personnel, (p) => p.violations, {
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'personnel_id' }),
    __metadata("design:type", personnel_entity_1.Personnel)
], Violation.prototype, "personnel", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => violation_link_entity_1.ViolationLink, (l) => l.violation, {
        cascade: true,
        eager: false,
    }),
    __metadata("design:type", Array)
], Violation.prototype, "links", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Object)
], Violation.prototype, "personnel_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Violation.prototype, "linked_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Violation.prototype, "linked_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Violation.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending' }),
    __metadata("design:type", String)
], Violation.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Violation.prototype, "rejected_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Violation.prototype, "rejected_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Violation.prototype, "reject_reason", void 0);
exports.Violation = Violation = __decorate([
    (0, typeorm_1.Entity)('violations'),
    (0, typeorm_1.Index)(['detected_at']),
    (0, typeorm_1.Index)(['personnel_id']),
    (0, typeorm_1.Index)(['camera_id'])
], Violation);
//# sourceMappingURL=violation.entity.js.map