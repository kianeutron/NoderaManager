import { vi } from "vitest";

type FakeMethods<Services> = { [Method in keyof Services]: ReturnType<typeof vi.fn> };

export type FakeServices<Services> = Services & FakeMethods<Services>;

/**
 * A stand-in for an application service object: every method is a `vi.fn` that resolves `{ ok: true }` unless overridden.
 * For adapter tests (MCP, HTTP), where the service is a boundary and only the adapter's behavior is under test.
 * The cast is confined to this helper: the proxy answers for any method name the adapter calls.
 */
export function createFakeServices<Services extends object>(overrides: Partial<Record<keyof Services, unknown>> = {}): FakeServices<Services> {
  const methods = new Map<PropertyKey, unknown>(Object.entries(overrides));
  return new Proxy({}, {
    get: (_target, name) => {
      if (!methods.has(name)) methods.set(name, vi.fn().mockResolvedValue({ ok: true }));
      return methods.get(name);
    }
  }) as FakeServices<Services>;
}
