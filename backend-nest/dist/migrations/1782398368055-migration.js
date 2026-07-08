"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration1782398368055 = void 0;
class Migration1782398368055 {
    constructor() {
        this.name = 'Migration1782398368055';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('safety_officer', 'supervisor', 'admin')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "username" character varying NOT NULL, "email" character varying NOT NULL, "hashed_password" character varying NOT NULL, "full_name" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'safety_officer', "is_active" boolean NOT NULL DEFAULT true, "last_login" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."violations_shift_enum" AS ENUM('Pagi', 'Siang', 'Malam')`);
        await queryRunner.query(`CREATE TYPE "public"."violations_helm_color_detected_enum" AS ENUM('Kuning', 'Putih', 'Hijau', 'Unknown')`);
        await queryRunner.query(`CREATE TABLE "violations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "violation_code" character varying NOT NULL, "track_id" integer NOT NULL, "camera_id" character varying NOT NULL, "detected_at" TIMESTAMP WITH TIME ZONE NOT NULL, "shift" "public"."violations_shift_enum" NOT NULL, "helm_color_detected" "public"."violations_helm_color_detected_enum" NOT NULL DEFAULT 'Unknown', "role_detected" character varying NOT NULL DEFAULT '', "missing_helm" boolean NOT NULL DEFAULT false, "missing_vest" boolean NOT NULL DEFAULT false, "missing_shoes" boolean NOT NULL DEFAULT false, "confidence" double precision NOT NULL DEFAULT '0', "bbox_x1" integer NOT NULL DEFAULT '0', "bbox_y1" integer NOT NULL DEFAULT '0', "bbox_x2" integer NOT NULL DEFAULT '0', "bbox_y2" integer NOT NULL DEFAULT '0', "frame_path" character varying, "personnel_id" uuid, "linked_by" character varying, "linked_at" TIMESTAMP WITH TIME ZONE, "notes" character varying, CONSTRAINT "UQ_f26ba287562ab5f5a70a456ad4f" UNIQUE ("violation_code"), CONSTRAINT "PK_a2aa2d655842de3c02315ba6073" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8d6c0ab1bfc0318bad437d783b" ON "violations"  ("camera_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_395169506d9baac8e6cdddf870" ON "violations"  ("personnel_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6219ea780cd8471a4974e1d446" ON "violations"  ("detected_at") `);
        await queryRunner.query(`CREATE TYPE "public"."sp_records_level_enum" AS ENUM('SP1', 'SP2', 'SP3')`);
        await queryRunner.query(`CREATE TABLE "sp_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sp_number" character varying NOT NULL, "personnel_id" uuid NOT NULL, "level" "public"."sp_records_level_enum" NOT NULL, "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "violation_count_at_issuance" integer NOT NULL, "issued_by" character varying, "revoked_at" TIMESTAMP WITH TIME ZONE, "revoked_by" character varying, "notes" character varying, "trigger_violation_id" character varying, CONSTRAINT "UQ_0ef059a81efabc643a489a85a1a" UNIQUE ("sp_number"), CONSTRAINT "PK_3858386cca56dbb9ae9ea406c97" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ec32312952d2dd80a082108fc6" ON "sp_records"  ("personnel_id", "is_active") `);
        await queryRunner.query(`CREATE TYPE "public"."personnel_role_enum" AS ENUM('Pekerja', 'Supervisor', 'Safety Officer')`);
        await queryRunner.query(`CREATE TYPE "public"."personnel_helm_color_enum" AS ENUM('Kuning', 'Putih', 'Hijau')`);
        await queryRunner.query(`CREATE TABLE "personnel" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "employee_id" character varying NOT NULL, "full_name" character varying NOT NULL, "role" "public"."personnel_role_enum" NOT NULL, "helm_color" "public"."personnel_helm_color_enum" NOT NULL, "department" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "notes" character varying, CONSTRAINT "UQ_31180f94ceb4cf5309ee96c53d5" UNIQUE ("employee_id"), CONSTRAINT "PK_33a7253a5d2a326fec3cdc0baa5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ea9245d9a86d023f6b099d377d" ON "personnel"  ("is_active") `);
        await queryRunner.query(`CREATE TABLE "sp_config" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "sp1_threshold" integer NOT NULL DEFAULT '3', "sp2_threshold" integer NOT NULL DEFAULT '7', "sp3_threshold" integer NOT NULL DEFAULT '12', "sp1_duration_days" integer NOT NULL DEFAULT '30', "sp2_duration_days" integer NOT NULL DEFAULT '60', "sp3_duration_days" integer NOT NULL DEFAULT '90', "updated_by" character varying, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_11d6de080ac251245d8b23e3ae3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cameras" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "camera_id" character varying NOT NULL, "name" character varying NOT NULL, "zone" character varying NOT NULL, "rtsp_url" character varying, "is_active" boolean NOT NULL DEFAULT true, "description" character varying, CONSTRAINT "UQ_d3472a04550d1674e6d6b0bdece" UNIQUE ("camera_id"), CONSTRAINT "PK_88b40b9817f9f422121f861e1e8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "violations" ADD CONSTRAINT "FK_395169506d9baac8e6cdddf870c" FOREIGN KEY ("personnel_id") REFERENCES "personnel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sp_records" ADD CONSTRAINT "FK_8fdd1e9a170a4f10e0be2a56f13" FOREIGN KEY ("personnel_id") REFERENCES "personnel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "sp_records" DROP CONSTRAINT "FK_8fdd1e9a170a4f10e0be2a56f13"`);
        await queryRunner.query(`ALTER TABLE "violations" DROP CONSTRAINT "FK_395169506d9baac8e6cdddf870c"`);
        await queryRunner.query(`DROP TABLE "cameras"`);
        await queryRunner.query(`DROP TABLE "sp_config"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea9245d9a86d023f6b099d377d"`);
        await queryRunner.query(`DROP TABLE "personnel"`);
        await queryRunner.query(`DROP TYPE "public"."personnel_helm_color_enum"`);
        await queryRunner.query(`DROP TYPE "public"."personnel_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ec32312952d2dd80a082108fc6"`);
        await queryRunner.query(`DROP TABLE "sp_records"`);
        await queryRunner.query(`DROP TYPE "public"."sp_records_level_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6219ea780cd8471a4974e1d446"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_395169506d9baac8e6cdddf870"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8d6c0ab1bfc0318bad437d783b"`);
        await queryRunner.query(`DROP TABLE "violations"`);
        await queryRunner.query(`DROP TYPE "public"."violations_helm_color_detected_enum"`);
        await queryRunner.query(`DROP TYPE "public"."violations_shift_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }
}
exports.Migration1782398368055 = Migration1782398368055;
//# sourceMappingURL=1782398368055-migration.js.map