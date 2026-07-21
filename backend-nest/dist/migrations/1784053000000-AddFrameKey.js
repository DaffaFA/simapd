"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddFrameKey1784053000000 = void 0;
class AddFrameKey1784053000000 {
    constructor() {
        this.name = 'AddFrameKey1784053000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "violations" ADD "frame_key" character varying`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "violations" DROP COLUMN "frame_key"`);
    }
}
exports.AddFrameKey1784053000000 = AddFrameKey1784053000000;
//# sourceMappingURL=1784053000000-AddFrameKey.js.map