const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

/** "Sep 30, 2026" in the viewer's locale and time zone. */
export function formatDate(isoTimestamp: string): string {
  return dateFormatter.format(new Date(isoTimestamp));
}

const dateTimeFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

/** "Sep 30, 2026, 2:15 PM" in the viewer's locale and time zone. */
export function formatDateTime(isoTimestamp: string): string {
  return dateTimeFormatter.format(new Date(isoTimestamp));
}

/** A `datetime-local` value back to an ISO instant, read as local time. An empty or unreadable value is no time at all. */
export function fromDateTimeLocalValue(localValue: string): string | undefined {
  const date = new Date(localValue);
  return localValue && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
}

/** The value a `datetime-local` input takes: the local date and time, to the minute, with no zone. */
export function toDateTimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
