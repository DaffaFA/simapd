import { MigrationInterface, QueryRunner } from "typeorm";

export class AddViolationLinks1784052002604 implements MigrationInterface {
    name = 'AddViolationLinks1784052002604'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "violation_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "violation_id" uuid NOT NULL, "personnel_id" uuid NOT NULL, "linked_by" character varying, "linked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "notes" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_26396774eff536f64f1dfcbabfb" UNIQUE ("violation_id", "personnel_id"), CONSTRAINT "PK_4fe50eb9e9d9942bd4aab1b9cf3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_76bfecc66f802da7c7148153ec" ON "violation_links"  ("personnel_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_9a46cce5f67816101d7b63bff9" ON "violation_links"  ("violation_id") `);
        await queryRunner.query(`ALTER TABLE "violation_links" ADD CONSTRAINT "FK_9a46cce5f67816101d7b63bff94" FOREIGN KEY ("violation_id") REFERENCES "violations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "violation_links" ADD CONSTRAINT "FK_76bfecc66f802da7c7148153ecb" FOREIGN KEY ("personnel_id") REFERENCES "personnel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        
        await queryRunner.query(`
            INSERT INTO violation_links (id, violation_id, personnel_id, linked_by, linked_at, notes)
            SELECT uuid_generate_v4(), id, personnel_id, linked_by, COALESCE(linked_at, NOW()), notes
            FROM violations
            WHERE personnel_id IS NOT NULL
            ON CONFLICT (violation_id, personnel_id) DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "violation_links" DROP CONSTRAINT "FK_76bfecc66f802da7c7148153ecb"`);
        await queryRunner.query(`ALTER TABLE "violation_links" DROP CONSTRAINT "FK_9a46cce5f67816101d7b63bff94"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9a46cce5f67816101d7b63bff9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_76bfecc66f802da7c7148153ec"`);
        await queryRunner.query(`DROP TABLE "violation_links"`);
    }

}
