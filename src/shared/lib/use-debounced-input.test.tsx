import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedInput } from "@/shared/lib/use-debounced-input";

describe("useDebouncedInput", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("commits only after the user pauses typing", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useDebouncedInput("", onCommit, 300));

    act(() => result.current[1]("bl"));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current[1]("blue"));
    act(() => vi.advanceTimersByTime(299));
    expect(onCommit).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith("blue");
  });

  it("adopts an outside change but ignores the echo of its own commit", () => {
    const { result, rerender } = renderHook(({ committed }) => useDebouncedInput(committed, vi.fn(), 300), { initialProps: { committed: "" } });

    act(() => result.current[1]("blue"));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current[1]("bluewave"));
    rerender({ committed: "blue" });
    expect(result.current[0]).toBe("bluewave");

    rerender({ committed: "" });
    expect(result.current[0]).toBe("");
  });
});
