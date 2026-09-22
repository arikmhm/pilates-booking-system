CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"member_package_id" uuid NOT NULL,
	"nomor_alat" integer NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"sumber" text DEFAULT 'member' NOT NULL,
	"dipromosikan_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dibatalkan_at" timestamp with time zone,
	CONSTRAINT "bookings_nomor_alat_check" CHECK ("bookings"."nomor_alat" >= 1)
);
--> statement-breakpoint
CREATE TABLE "class_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"kapasitas_default" integer NOT NULL,
	"durasi_menit" integer DEFAULT 60 NOT NULL,
	"warna" text
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_package_id" uuid NOT NULL,
	"booking_id" uuid,
	"delta" integer NOT NULL,
	"alasan" text NOT NULL,
	"pelaku_id" uuid,
	"catatan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_ledger_delta_check" CHECK ("credit_ledger"."delta" <> 0)
);
--> statement-breakpoint
CREATE TABLE "member_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"dibeli_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hangus_at" timestamp with time zone NOT NULL,
	"jumlah_kredit_awal" integer NOT NULL,
	"diperpanjang_at" timestamp with time zone,
	CONSTRAINT "member_packages_masa_check" CHECK ("member_packages"."hangus_at" > "member_packages"."dibeli_at")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kanal" text NOT NULL,
	"template" text NOT NULL,
	"isi" text NOT NULL,
	"session_id" uuid,
	"terkirim_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "package_class_types" (
	"package_id" uuid NOT NULL,
	"class_type_id" uuid NOT NULL,
	CONSTRAINT "package_class_types_package_id_class_type_id_pk" PRIMARY KEY("package_id","class_type_id")
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"jumlah_kredit" integer NOT NULL,
	"masa_berlaku_hari" integer NOT NULL,
	"harga_rupiah" integer NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"class_type_id" uuid NOT NULL,
	"coach_id" uuid,
	"hari" integer NOT NULL,
	"jam_mulai" time NOT NULL,
	"kapasitas" integer,
	"level" text,
	"berlaku_dari" date NOT NULL,
	"berlaku_sampai" date,
	CONSTRAINT "schedule_rules_hari_check" CHECK ("schedule_rules"."hari" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"schedule_rule_id" uuid,
	"class_type_id" uuid NOT NULL,
	"coach_id" uuid,
	"mulai_at" timestamp with time zone NOT NULL,
	"durasi_menit" integer NOT NULL,
	"kapasitas" integer NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"alasan_batal" text,
	"dibatalkan_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "studios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"logo_url" text,
	"warna_utama" text,
	"cancel_window_hours" integer DEFAULT 12 NOT NULL,
	"booking_opens_days" integer DEFAULT 7 NOT NULL,
	"booking_closes_hours" integer DEFAULT 1 NOT NULL,
	"studio_cancel_extension_days" integer DEFAULT 7 NOT NULL,
	"waitlist_max" integer DEFAULT 5 NOT NULL,
	"noshow_after_hours" integer DEFAULT 2 NOT NULL,
	"generate_weeks_ahead" integer DEFAULT 8 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"nama" text NOT NULL,
	"telepon" text NOT NULL,
	"email" text,
	"peran" text DEFAULT 'member' NOT NULL,
	"foto_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_package_id_member_packages_id_fk" FOREIGN KEY ("member_package_id") REFERENCES "public"."member_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_types" ADD CONSTRAINT "class_types_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_member_package_id_member_packages_id_fk" FOREIGN KEY ("member_package_id") REFERENCES "public"."member_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_pelaku_id_users_id_fk" FOREIGN KEY ("pelaku_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_packages" ADD CONSTRAINT "member_packages_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_class_types" ADD CONSTRAINT "package_class_types_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_class_types" ADD CONSTRAINT "package_class_types_class_type_id_class_types_id_fk" FOREIGN KEY ("class_type_id") REFERENCES "public"."class_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_class_type_id_class_types_id_fk" FOREIGN KEY ("class_type_id") REFERENCES "public"."class_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_schedule_rule_id_schedule_rules_id_fk" FOREIGN KEY ("schedule_rule_id") REFERENCES "public"."schedule_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_class_type_id_class_types_id_fk" FOREIGN KEY ("class_type_id") REFERENCES "public"."class_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_sesi_alat_key" ON "bookings" USING btree ("session_id","nomor_alat") WHERE status = 'confirmed';--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_sesi_user_key" ON "bookings" USING btree ("session_id","user_id") WHERE status = 'confirmed';--> statement-breakpoint
CREATE INDEX "credit_ledger_member_package_idx" ON "credit_ledger" USING btree ("member_package_id");--> statement-breakpoint
CREATE INDEX "member_packages_user_hangus_idx" ON "member_packages" USING btree ("user_id","hangus_at");--> statement-breakpoint
CREATE INDEX "sessions_studio_mulai_idx" ON "sessions" USING btree ("studio_id","mulai_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_studio_telepon_key" ON "users" USING btree ("studio_id","telepon");--> statement-breakpoint
CREATE UNIQUE INDEX "users_studio_email_key" ON "users" USING btree ("studio_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_sesi_user_key" ON "waitlist_entries" USING btree ("session_id","user_id") WHERE status = 'waiting';