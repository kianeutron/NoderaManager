import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInButton } from "@/app/auth/sign-in/SignInButton";
import { renderWithTheme } from "@/test/render-with-theme";

const { social } = vi.hoisted(() => ({ social: vi.fn() }));
vi.mock("@neondatabase/neon-js/auth/next", () => ({ createAuthClient: () => ({ signIn: { social } }) }));

describe("SignInButton", () => {
  beforeEach(() => {
    social.mockReset();
  });

  it("shows a failure from an earlier attempt", () => {
    renderWithTheme(<SignInButton initialNotice="Sign-in was cancelled." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in was cancelled.");
  });

  it("disables itself while it opens Google", async () => {
    social.mockReturnValue(new Promise(() => undefined));
    renderWithTheme(<SignInButton initialNotice={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(await screen.findByRole("button", { name: "Opening Google…" })).toBeDisabled();
  });

  it.each([["an error result", () => social.mockResolvedValue({ error: { message: "provider said: secret" } })], ["a rejected request", () => social.mockRejectedValue(new TypeError("Failed to fetch"))]])("explains %s without provider text and lets the user retry", async (_case, arrange) => {
    arrange();
    renderWithTheme(<SignInButton initialNotice={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("We couldn't start sign-in."));
    expect(document.body.textContent).not.toMatch(/secret|Failed to fetch/);
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });
});
