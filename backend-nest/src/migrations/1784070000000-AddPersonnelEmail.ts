import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPersonnelEmail1784070000000 implements MigrationInterface {
  name = 'AddPersonnelEmail1784070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'personnel',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('personnel', 'email');
  }
}
