import { ThemeProvider } from "@mui/material/styles";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { outreachTheme } from "@/shared/ui/theme";

export function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={outreachTheme}>{ui}</ThemeProvider>);
}
