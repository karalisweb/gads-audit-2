import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLandingPageBriefs1772597370249 implements MigrationInterface {
    name = 'AddLandingPageBriefs1772597370249'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."landing_page_briefs_status_enum" AS ENUM('draft', 'completed')`);
        await queryRunner.query(`CREATE TABLE "landing_page_briefs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "account_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "source_url" character varying(2048), "primary_keyword" character varying(500), "keyword_cluster" jsonb, "scraped_content" jsonb, "brief" jsonb, "status" "public"."landing_page_briefs_status_enum" NOT NULL DEFAULT 'draft', "notes" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9d9800d1e6405a27465096880a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "landing_page_briefs" ADD CONSTRAINT "FK_cfb3c9b8d021a7cf0e5155306c4" FOREIGN KEY ("account_id") REFERENCES "google_ads_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "landing_page_briefs" DROP CONSTRAINT "FK_cfb3c9b8d021a7cf0e5155306c4"`);
        await queryRunner.query(`DROP TABLE "landing_page_briefs"`);
        await queryRunner.query(`DROP TYPE "public"."landing_page_briefs_status_enum"`);
    }
}
