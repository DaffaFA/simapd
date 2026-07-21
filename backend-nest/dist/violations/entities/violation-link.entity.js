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
exports.ViolationLink = void 0;
const typeorm_1 = require("typeorm");
const violation_entity_1 = require("./violation.entity");
const personnel_entity_1 = require("../../personnel/entities/personnel.entity");
let ViolationLink = class ViolationLink extends typeorm_1.BaseEntity {
};
exports.ViolationLink = ViolationLink;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ViolationLink.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ViolationLink.prototype, "violation_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => violation_entity_1.Violation, (v) => v.links),
    (0, typeorm_1.JoinColumn)({ name: 'violation_id' }),
    __metadata("design:type", violation_entity_1.Violation)
], ViolationLink.prototype, "violation", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ViolationLink.prototype, "personnel_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => personnel_entity_1.Personnel),
    (0, typeorm_1.JoinColumn)({ name: 'personnel_id' }),
    __metadata("design:type", personnel_entity_1.Personnel)
], ViolationLink.prototype, "personnel", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ViolationLink.prototype, "linked_by", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], ViolationLink.prototype, "linked_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ViolationLink.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ViolationLink.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], ViolationLink.prototype, "updated_at", void 0);
exports.ViolationLink = ViolationLink = __decorate([
    (0, typeorm_1.Entity)('violation_links'),
    (0, typeorm_1.Index)(['violation_id']),
    (0, typeorm_1.Index)(['personnel_id']),
    (0, typeorm_1.Unique)(['violation_id', 'personnel_id'])
], ViolationLink);
//# sourceMappingURL=violation-link.entity.js.map