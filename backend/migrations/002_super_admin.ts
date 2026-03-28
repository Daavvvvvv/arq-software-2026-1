import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuperAdmin1700000000002 implements MigrationInterface {
  name = 'SuperAdmin1700000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "rol_usuario_enum" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'`);
    await queryRunner.query(`ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "recintoId" UUID`);
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        ADD CONSTRAINT "FK_usuarios_recinto"
        FOREIGN KEY ("recintoId") REFERENCES "recintos"("id")
        ON DELETE SET NULL
        NOT VALID
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "FK_usuarios_recinto"`);
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "recintoId"`);
    // PostgreSQL no permite eliminar valores de un enum, se deja el valor
  }
}
