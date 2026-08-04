import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddViolationStatus1784060000000 implements MigrationInterface {
  name = 'AddViolationStatus1784060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'violations',
      new TableColumn({
        name: 'status',
        type: 'varchar',
        length: '20',
        default: "'pending'",
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'violations',
      new TableColumn({
        name: 'rejected_by',
        type: 'varchar',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'violations',
      new TableColumn({
        name: 'rejected_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'violations',
      new TableColumn({
        name: 'reject_reason',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('violations', 'reject_reason');
    await queryRunner.dropColumn('violations', 'rejected_at');
    await queryRunner.dropColumn('violations', 'rejected_by');
    await queryRunner.dropColumn('violations', 'status');
  }
}
