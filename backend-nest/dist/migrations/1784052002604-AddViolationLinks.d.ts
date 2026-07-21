import { MigrationInterface, QueryRunner } from "typeorm";
export declare class AddViolationLinks1784052002604 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
