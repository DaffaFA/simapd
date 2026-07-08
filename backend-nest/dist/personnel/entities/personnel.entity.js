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
exports.Personnel = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
const violation_entity_1 = require("../../violations/entities/violation.entity");
const sp_record_entity_1 = require("../../sp/entities/sp-record.entity");
let Personnel = class Personnel extends base_entity_1.BaseEntity {
};
exports.Personnel = Personnel;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Personnel.prototype, "employee_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Personnel.prototype, "full_name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['Pekerja', 'Supervisor', 'Safety Officer'] }),
    __metadata("design:type", String)
], Personnel.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['Kuning', 'Putih', 'Hijau'] }),
    __metadata("design:type", String)
], Personnel.prototype, "helm_color", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Personnel.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Personnel.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Personnel.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => violation_entity_1.Violation, (v) => v.personnel),
    __metadata("design:type", Array)
], Personnel.prototype, "violations", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => sp_record_entity_1.SpRecord, (sp) => sp.personnel),
    __metadata("design:type", Array)
], Personnel.prototype, "sp_records", void 0);
exports.Personnel = Personnel = __decorate([
    (0, typeorm_1.Entity)('personnel'),
    (0, typeorm_1.Index)(['is_active'])
], Personnel);
//# sourceMappingURL=personnel.entity.js.map