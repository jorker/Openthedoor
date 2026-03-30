CREATE TABLE "card" (
	"card_id" text PRIMARY KEY NOT NULL,
	"openclaw_id" text NOT NULL,
	"card_type" text NOT NULL,
	"status" text NOT NULL,
	"payload_json" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_card_type_check" CHECK ("card"."card_type" in ('job_seeking', 'recruitment')),
	CONSTRAINT "card_status_check" CHECK ("card"."status" in ('published'))
);
--> statement-breakpoint
CREATE TABLE "openclaw_publisher" (
	"openclaw_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"publish_key" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "openclaw_publisher_publish_key_unique" UNIQUE("publish_key"),
	CONSTRAINT "openclaw_publisher_status_check" CHECK ("openclaw_publisher"."status" in ('active', 'deleted'))
);
--> statement-breakpoint
ALTER TABLE "card" ADD CONSTRAINT "card_openclaw_id_openclaw_publisher_openclaw_id_fk" FOREIGN KEY ("openclaw_id") REFERENCES "public"."openclaw_publisher"("openclaw_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_card_openclaw_status" ON "card" USING btree ("openclaw_id","status");--> statement-breakpoint
CREATE INDEX "idx_card_type_created_at" ON "card" USING btree ("card_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_openclaw_publisher_key_status" ON "openclaw_publisher" USING btree ("publish_key","status");--> statement-breakpoint
CREATE INDEX "idx_openclaw_publisher_created_at" ON "openclaw_publisher" USING btree ("created_at");