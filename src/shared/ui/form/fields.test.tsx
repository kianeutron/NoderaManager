import { fireEvent, screen } from "@testing-library/react";
import { useForm, useWatch } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { MultiSelectField } from "@/shared/ui/form/fields";
import { renderWithTheme } from "@/test/render-with-theme";

const options = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "c", label: "Gamma" }];

function Harness({ initial, onValue }: Readonly<{ initial: string[]; onValue: (value: string[]) => void }>) {
  const form = useForm<{ picks: string[] }>({ defaultValues: { picks: initial } });
  onValue(useWatch({ control: form.control, name: "picks" }));
  return <MultiSelectField control={form.control} label="Picks" name="picks" options={options} />;
}

describe("MultiSelectField", () => {
  it("says Any when nothing is chosen, and shows the chosen labels otherwise", () => {
    const { unmount } = renderWithTheme(<Harness initial={[]} onValue={() => undefined} />);
    expect(screen.getByRole("combobox", { name: "Picks" })).toHaveTextContent("Any");
    unmount();

    renderWithTheme(<Harness initial={["a", "c"]} onValue={() => undefined} />);
    expect(screen.getByRole("combobox", { name: "Picks" })).toHaveTextContent("AlphaGamma");
  });

  it("adds and removes choices without closing", () => {
    let value: string[] = [];
    renderWithTheme(<Harness initial={[]} onValue={(next) => { value = next; }} />);
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Picks" }));
    fireEvent.click(screen.getByRole("option", { name: "Beta" }));
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
    expect(value).toEqual(["b", "a"]);

    fireEvent.click(screen.getByRole("option", { name: "Beta" }));
    expect(value).toEqual(["a"]);
  });
});
