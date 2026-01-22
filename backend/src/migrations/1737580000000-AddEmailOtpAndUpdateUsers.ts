import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailOtpAndUpdateUsers1737580000000 implements MigrationInterface {
  name = 'AddEmailOtpAndUpdateUsers1737580000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create email_otps table
    await queryRunner.query(`
      CREATE TABLE "email_otps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "code_hash" character varying(255) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used" boolean NOT NULL DEFAULT false,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "type" character varying(20) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_otps" PRIMARY KEY ("id")
      )
    `);

    // Create indexes on email_otps
    await queryRunner.query(`CREATE INDEX "IDX_email_otps_email" ON "email_otps" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_email_otps_email_expires_at" ON "email_otps" ("email", "expires_at")`);

    // Add name column to users
    await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying(100)`);

    // Add two_factor_enabled column to users
    await queryRunner.query(`ALTER TABLE "users" ADD "two_factor_enabled" boolean NOT NULL DEFAULT false`);

    // Migrate existing totp_enabled data to two_factor_enabled
    await queryRunner.query(`UPDATE "users" SET "two_factor_enabled" = "totp_enabled" WHERE "totp_enabled" IS NOT NULL`);

    // Drop old TOTP columns
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "totp_secret"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "totp_enabled"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "backup_codes"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore TOTP columns
    await queryRunner.query(`ALTER TABLE "users" ADD "totp_secret" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "totp_enabled" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD "backup_codes" jsonb`);

    // Migrate two_factor_enabled back to totp_enabled
    await queryRunner.query(`UPDATE "users" SET "totp_enabled" = "two_factor_enabled"`);

    // Drop new columns
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "two_factor_enabled"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);

    // Drop email_otps table
    await queryRunner.query(`DROP INDEX "IDX_email_otps_email_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_email_otps_email"`);
    await queryRunner.query(`DROP TABLE "email_otps"`);
  }
}
