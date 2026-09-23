CREATE UNIQUE INDEX "class_types_studio_nama_key" ON "class_types" USING btree ("studio_id","nama");--> statement-breakpoint
ALTER TABLE "class_types" DROP COLUMN "warna";