// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/[[...route]]/route";
import { requireDashboardOwner } from "@/shared/auth/access-boundary";

// The services behind each router import the server-only database client; nothing here queries it.
vi.mock("server-only", () => ({}));
vi.mock("@/shared/auth/access-boundary", () => ({
  requireDashboardOwner: vi.fn(),
  AccessBoundaryError: class extends Error { public constructor(public readonly status: 401 | 403) { super("Access denied"); } }
}));

// One real GET path per module router. Signed out, a mounted router answers 401; a router that is not mounted answers 404.
const mounted = [
  "/api/library/documents", "/api/people", "/api/organizations", "/api/notes", "/api/outreach/summary", "/api/interactions",
  "/api/followups/summary", "/api/campaigns", "/api/prospects", "/api/routes", "/api/analytics/overview", "/api/analytics/insights", "/api/analytics/breakdown"
];

describe("the API router", () => {
  beforeEach(async () => {
    const { AccessBoundaryError } = await import("@/shared/auth/access-boundary");
    vi.mocked(requireDashboardOwner).mockRejectedValue(new AccessBoundaryError(401));
  });

  it.each(mounted)("mounts %s behind the owner check", async (path) => {
    const response = await GET(new Request(`http://localhost${path}`));
    expect(response.status).toBe(401);
  });

  it("answers an unknown path with a 404", async () => {
    expect((await GET(new Request("http://localhost/api/nothing-here"))).status).toBe(404);
  });
});
