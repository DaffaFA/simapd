import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFrameKey1784053000000 implements MigrationInterface {
    name = 'AddFrameKey1784053000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "violations" ADD "frame_key" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "violations" DROP COLUMN "frame_key"`);
    }
}
