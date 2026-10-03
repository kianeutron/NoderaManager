import type { Overview } from "@/modules/analytics/domain/analytics.types";

const zero = { sent: 0, replies: 0 };
const noStats = { prospects: 0, openProspects: 0, won: 0, messages: 0, replies: 0 };

/** A small, believable overview for component tests. Override only what a test is about. */
export function overviewFixture(overrides: Partial<Overview> = {}): Overview {
  return {
    range: "30d", days: 30, from: "2026-09-02", to: "2026-10-01",
    totals: { sent: { current: 12, previous: 8 }, reached: { current: 6, previous: 4 }, replies: { current: 3, previous: 3 }, replyRate: { current: { part: 2, whole: 6 }, previous: { part: 1, whole: 4 } } },
    activity: [{ date: "2026-09-30", sent: 4, replies: 1 }, { date: "2026-10-01", sent: 2, replies: 0 }],
    calendar: [{ date: "2026-09-29", ...zero }, { date: "2026-09-30", sent: 4, replies: 1 }, { date: "2026-10-01", sent: 2, replies: 0 }],
    pipeline: [{ status: "researched", prospects: 9 }, { status: "contacted", prospects: 5 }, { status: "won", prospects: 1 }, { status: "lost", prospects: 2 }],
    channels: [{ channel: "email", sent: 8, replied: 2 }, { channel: "linkedin", sent: 4, replied: 1 }, { channel: "inmail", sent: 0, replied: 0 }, { channel: "other", sent: 0, replied: 0 }],
    depth: Array.from({ length: 9 }, (_, index) => ({ depth: index + 1, prospects: index === 2 ? 2 : 0 })),
    awaitingReply: { total: 1, items: [{ messageId: "m1", prospectId: "p1", channel: "email", sentAt: "2026-09-25T10:00:00.000Z", personName: "Marta Chen", organizationName: "Bluewave" }] },
    followUps: {
      summary: { overdue: 2, next7Days: 1, later: 0, noDate: 0 },
      overdue: [{ id: "f1", status: "active", reason: "Share the case study", dueAt: "2026-09-28T09:00:00.000Z", notBeforeAt: null, suggestedChannel: null, completedAt: null, dismissedReason: null, createdAt: "2026-09-20T09:00:00.000Z", prospect: { id: "p2", status: "contacted", routeName: "Agencies" }, person: { id: "pe2", fullName: "Julian Park" }, organization: null }]
    },
    routes: [{ id: "r1", name: "Agency Overflow", description: null, sortOrder: 0, archivedAt: null, stats: { ...noStats, prospects: 5, messages: 12, replies: 3, won: 1 }, modules: [] }, { id: "r2", name: "Recruiters", description: null, sortOrder: 1, archivedAt: null, stats: { ...noStats, prospects: 2, messages: 4, replies: 1 }, modules: [] }],
    campaigns: [{ id: "c1", name: "Q4 agencies", status: "active", goal: null, startsAt: null, endsAt: null, archivedAt: null, updatedAt: "2026-09-30T00:00:00.000Z", routes: [], stats: { members: 8, contacted: 4, won: 0, messages: 6, replies: 2 } }],
    ...overrides
  };
}
