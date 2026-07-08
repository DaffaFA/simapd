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
exports.SpConfig = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../common/entities/base.entity");
let SpConfig = class SpConfig extends base_entity_1.BaseEntity {
};
exports.SpConfig = SpConfig;
__decorate([
    (0, typeorm_1.Column)({ default: 3 }),
    __metadata("design:type", Number)
], SpConfig.prototype, "sp1_threshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 7 }),
    __metadata("design:type", Number)
], SpConfig.prototype, "sp2_threshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 12 }),
    __metadata("design:type", Number)
], SpConfig.prototype, "sp3_threshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 30 }),
    __metadata("design:type", Number)
], SpConfig.prototype, "sp1_duration_days", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 60 }),
    __metadata("design:type", Number)
], SpConfig.prototype, "sp2_duration_days", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 90 }),
    __metadata("design:type", Number)
], SpConfig.prototype, "sp3_duration_days", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], SpConfig.prototype, "updated_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], SpConfig.prototype, "is_active", void 0);
exports.SpConfig = SpConfig = __decorate([
    (0, typeorm_1.Entity)('sp_config')
], SpConfig);
//# sourceMappingURL=sp-config.entity.js.map