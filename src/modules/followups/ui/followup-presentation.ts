import type { FollowUpChannel, FollowUpStatus } from "@/modules/followups/domain/followup.types";
import type { followUpDueValues } from "@/modules/followups/domain/followup.schema";

export const followUpStatusLabel = { active: "Active", completed: "Completed", dismissed: "Dismissed" } as const satisfies Record<FollowUpStatus, string>;

export const followUpDueLabel = { overdue: "Overdue", next_7_days: "Next 7 days", later: "Later", no_date: "No date" } as const satisfies Record<(typeof followUpDueValues)[number], string>;

export const followUpChannelLabel = { email: "Email", linkedin: "LinkedIn", inmail: "LinkedIn InMail", other: "Other" } as const satisfies Record<FollowUpChannel, string>;

const day = 24 * 60 * 60 * 1000;
const plural = (count: number) => `${count} day${count === 1 ? "" : "s"}`;

/** How far a due date is from `now`, in words: "Overdue by 3 days", "Due within a day", "Due in 5 days". */
export function describeDue(dueAt: string | null, now: Date): string {
  if (dueAt === null) return "No date";
  const difference = new Date(dueAt).getTime() - now.getTime();
  if (difference < 0) return difference > -day ? "Overdue" : `Overdue by ${plural(Math.floor(-difference / day))}`;
  return difference < day ? "Due within a day" : `Due in ${plural(Math.ceil(difference / day))}`;
}

export const isOverdue = (dueAt: string | null, now: Date): boolean => dueAt !== null && new Date(dueAt).getTime() < now.getTime();
