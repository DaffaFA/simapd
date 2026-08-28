import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserSignature1787649114143 implements MigrationInterface {
    name = 'AddUserSignature1787649114143'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "signature" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "signature"`);
    }

}
