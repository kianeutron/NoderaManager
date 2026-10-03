CREATE TABLE "rate_limit_windows" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"request_count" integer NOT NULL,
	CONSTRAINT "rate_limit_windows_key_window_start_pk" PRIMARY KEY("key","window_start"),
	CONSTRAINT "rate_limit_windows_request_count_positive" CHECK ("rate_limit_windows"."request_count" > 0)
);
