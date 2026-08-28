import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDetectionStats1787833276689 implements MigrationInterface {
    name = 'AddDetectionStats1787833276689'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "detection_stats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "date" date NOT NULL, "camera_id" character varying NOT NULL, "total_count" integer NOT NULL DEFAULT '0', "violation_count" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_ebaab619f702cb55481adfa0131" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3b418c3e4baf8d242bf3afeafe" ON "detection_stats" ("date", "camera_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_3b418c3e4baf8d242bf3afeafe"`);
        await queryRunner.query(`DROP TABLE "detection_stats"`);
    }

}
